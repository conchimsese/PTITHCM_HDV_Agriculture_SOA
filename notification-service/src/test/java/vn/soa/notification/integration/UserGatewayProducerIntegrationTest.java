package vn.soa.notification.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import vn.soa.notification.consumer.NotificationKafkaListener;
import vn.soa.notification.dto.ErrorResponse;
import vn.soa.notification.dto.NotificationDto;
import vn.soa.notification.dto.PageResponse;
import vn.soa.notification.entity.NotificationEntity;
import vn.soa.notification.event.EventEnvelope;
import vn.soa.notification.repository.NotificationReceiptRepository;
import vn.soa.notification.repository.NotificationRepository;
import vn.soa.notification.util.TestJwtHelper;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserGatewayProducerIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("notification_db")
            .withUsername("notification_app")
            .withPassword(UUID.randomUUID().toString());

    static MockWebServer mockUserService;

    @BeforeAll
    static void startMockServer() throws Exception {
        mockUserService = new MockWebServer();
        mockUserService.start();
    }

    @AfterAll
    static void stopMockServer() throws Exception {
        mockUserService.shutdown();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("DB_URL", POSTGRES::getJdbcUrl);
        registry.add("DB_USERNAME", POSTGRES::getUsername);
        registry.add("DB_PASSWORD", POSTGRES::getPassword);
        registry.add("app.user-service.base-url", () -> mockUserService.url("").toString());
        registry.add("app.security.internal-service-key", () -> "test-notification-internal-key");
    }

    @Autowired
    private TestRestTemplate http;

    @Autowired
    private NotificationKafkaListener kafkaListener;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationReceiptRepository receiptRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void cleanUp() {
        notificationRepository.deleteAll();
        receiptRepository.deleteAll();
    }

    private EventEnvelope loadFixture(String fixtureName) throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/fixtures/" + fixtureName)) {
            return objectMapper.readValue(is, EventEnvelope.class);
        }
    }

    private HttpHeaders createAuthHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    void endToEnd_ProducerToConsumerToGatewayRest_ActiveUser() throws Exception {
        // 1. Producer publishes OFFER_CREATED
        EventEnvelope envelope = loadFixture("offer_created.json");
        UUID recipientId = envelope.recipientIds().get(0);

        ConsumerRecord<String, Object> record = new ConsumerRecord<>(
                "soa.trading.offer.v1", 0, 1L, envelope.referenceId().toString(), envelope
        );
        kafkaListener.onMessage(record, () -> {});

        // Assert DB persisted
        assertThat(notificationRepository.count()).isEqualTo(1);
        assertThat(receiptRepository.count()).isEqualTo(1);

        // 2. Gateway/Client calls GET /api/v1/notifications for ACTIVE account
        mockUserService.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {
                          "accountId": "%s",
                          "state": "ACTIVE",
                          "role": "FARMER"
                        }
                        """.formatted(recipientId)));

        String token = TestJwtHelper.createToken(recipientId, "FARMER");
        HttpEntity<Void> request = new HttpEntity<>(createAuthHeaders(token));

        ResponseEntity<PageResponse> response = http.exchange(
                "/api/v1/notifications", HttpMethod.GET, request, PageResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalElements()).isEqualTo(1);

        // Verify the call to User Service checked access-state with X-Service-Key
        RecordedRequest userReq = mockUserService.takeRequest();
        assertThat(userReq.getPath()).isEqualTo("/internal/v1/accounts/" + recipientId + "/access-state");
        assertThat(userReq.getHeader("X-Service-Key")).isEqualTo("test-notification-internal-key");
    }

    @Test
    void endToEnd_LockedUser_KafkaPersistsNotification_RestCallsAreBlocked403() throws Exception {
        // Requirement §3 & §4: Kafka consumer vẫn persist thông báo cho locked account, nhưng REST bị 403
        UUID lockedUserId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();

        String lockedEventJson = """
                {
                  "eventId": "%s",
                  "eventType": "ACCOUNT_LOCKED",
                  "eventVersion": 1,
                  "sourceService": "user-service",
                  "occurredAt": "%s",
                  "actorId": "00000000-0000-0000-0000-000000000000",
                  "recipientIds": ["%s"],
                  "referenceType": "ACCOUNT",
                  "referenceId": "%s",
                  "data": {
                    "accountId": "%s",
                    "reason": "FRAUD_DETECTED"
                  }
                }
                """.formatted(eventId, Instant.now(), lockedUserId, lockedUserId, lockedUserId);

        EventEnvelope envelope = objectMapper.readValue(lockedEventJson, EventEnvelope.class);

        ConsumerRecord<String, Object> record = new ConsumerRecord<>(
                "soa.user.account.v1", 0, 10L, lockedUserId.toString(), envelope
        );

        // Consumer must persist notification even though user is LOCKED
        kafkaListener.onMessage(record, () -> {});

        assertThat(notificationRepository.count()).isEqualTo(1);
        assertThat(receiptRepository.count()).isEqualTo(1);

        // Now user tries to call REST endpoint -> User service returns state: LOCKED
        mockUserService.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {
                          "accountId": "%s",
                          "state": "LOCKED",
                          "role": "FARMER"
                        }
                        """.formatted(lockedUserId)));

        String token = TestJwtHelper.createToken(lockedUserId, "FARMER");
        HttpEntity<Void> request = new HttpEntity<>(createAuthHeaders(token));

        ResponseEntity<ErrorResponse> res = http.exchange(
                "/api/v1/notifications", HttpMethod.GET, request, ErrorResponse.class
        );

        // Must return 403 ACCOUNT_NOT_ACTIVE
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().code()).isEqualTo("ACCOUNT_NOT_ACTIVE");

        try {
            mockUserService.takeRequest();
        } catch (InterruptedException ignored) {}
    }

    @Test
    void endToEnd_UserServiceUnavailableOrTimeout_Returns503() {
        UUID userId = UUID.randomUUID();

        // User service returns 500 error or closes connection
        mockUserService.enqueue(new MockResponse().setResponseCode(500));

        String token = TestJwtHelper.createToken(userId, "TRADER");
        HttpEntity<Void> request = new HttpEntity<>(createAuthHeaders(token));

        ResponseEntity<ErrorResponse> res = http.exchange(
                "/api/v1/notifications", HttpMethod.GET, request, ErrorResponse.class
        );

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().code()).isEqualTo("ACCESS_STATE_UNAVAILABLE");

        try {
            mockUserService.takeRequest();
        } catch (InterruptedException ignored) {}
    }
}
