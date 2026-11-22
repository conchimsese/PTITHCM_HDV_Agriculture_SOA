package vn.soa.notification.controller;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import vn.soa.notification.client.UserServiceClient;
import vn.soa.notification.dto.ErrorResponse;
import vn.soa.notification.dto.MarkReadResponse;
import vn.soa.notification.dto.NotificationDto;
import vn.soa.notification.dto.PageResponse;
import vn.soa.notification.dto.UnreadCountResponse;
import vn.soa.notification.exception.AccessStateUnavailableException;
import vn.soa.notification.exception.AccountNotActiveException;
import vn.soa.notification.util.TestJwtHelper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class NotificationControllerTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("notification_db")
            .withUsername("notification_app")
            .withPassword(UUID.randomUUID().toString());

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("DB_URL", POSTGRES::getJdbcUrl);
        registry.add("DB_USERNAME", POSTGRES::getUsername);
        registry.add("DB_PASSWORD", POSTGRES::getPassword);
    }

    private static final Instant FIXED_NOW = Instant.parse("2026-10-18T10:00:00Z");

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        public Clock fixedClock() {
            return Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    private TestRestTemplate http;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private Flyway flyway;

    @MockBean
    private UserServiceClient userServiceClient;

    @BeforeEach
    void setupDatabase() {
        jdbc.update("DELETE FROM notifications");
        jdbc.update("DELETE FROM notification_receipts");
    }

    private HttpHeaders createAuthHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private void insertNotification(UUID id, UUID eventId, UUID recipientId, String type,
                                    String referenceType, UUID referenceId, String status,
                                    Instant occurredAt, Instant createdAt, Instant readAt) {
        jdbc.update("""
                INSERT INTO notifications (notification_id, event_id, recipient_id, type, title, content,
                    source_service, source_event, reference_type, reference_id, status, occurred_at, created_at, read_at)
                VALUES (?, ?, ?, ?, 'Test Title', 'Test Content', 'test-service', 'test-event',
                    ?, ?, ?, ?, ?, ?)
                """, id, eventId, recipientId, type, referenceType, referenceId, status,
                java.sql.Timestamp.from(occurredAt),
                java.sql.Timestamp.from(createdAt),
                readAt != null ? java.sql.Timestamp.from(readAt) : null);
    }

    @Test
    void unauthenticatedRequestReturns401() {
        ResponseEntity<ErrorResponse> response = http.getForEntity("/api/v1/notifications", ErrorResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("UNAUTHORIZED");
    }

    @Test
    void accountNotActiveReturns403() {
        UUID farmerId = UUID.randomUUID();
        String token = TestJwtHelper.createToken(farmerId, "FARMER");

        doThrow(new AccountNotActiveException("Account is not ACTIVE: " + farmerId))
                .when(userServiceClient).verifyAccountActive(eq(farmerId));

        HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders(token));
        ResponseEntity<ErrorResponse> response = http.exchange(
                "/api/v1/notifications", HttpMethod.GET, entity, ErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("ACCOUNT_NOT_ACTIVE");
    }

    @Test
    void accessStateUnavailableReturns503() {
        UUID farmerId = UUID.randomUUID();
        String token = TestJwtHelper.createToken(farmerId, "FARMER");

        doThrow(new AccessStateUnavailableException("User service unavailable"))
                .when(userServiceClient).verifyAccountActive(eq(farmerId));

        HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders(token));
        ResponseEntity<ErrorResponse> response = http.exchange(
                "/api/v1/notifications", HttpMethod.GET, entity, ErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("ACCESS_STATE_UNAVAILABLE");
    }

    @Test
    void listNotifications_FiltersAndResourceScoping() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        doNothing().when(userServiceClient).verifyAccountActive(eq(userA));

        Instant validTime1 = FIXED_NOW.minus(Duration.ofDays(10));
        Instant validTime2 = FIXED_NOW.minus(Duration.ofDays(20));
        Instant expiredTime = FIXED_NOW.minus(Duration.ofDays(95)); // > 90 days ago

        // userA: 2 valid, 1 expired
        insertNotification(UUID.randomUUID(), UUID.randomUUID(), userA, "OFFER_CREATED", "OFFER", UUID.randomUUID(), "UNREAD", validTime1, validTime1, null);
        insertNotification(UUID.randomUUID(), UUID.randomUUID(), userA, "MESSAGE_CREATED", "CONVERSATION", UUID.randomUUID(), "READ", validTime2, validTime2, validTime2);
        insertNotification(UUID.randomUUID(), UUID.randomUUID(), userA, "OFFER_CREATED", "OFFER", UUID.randomUUID(), "UNREAD", expiredTime, expiredTime, null);

        // userB: 1 valid
        insertNotification(UUID.randomUUID(), UUID.randomUUID(), userB, "OFFER_CREATED", "OFFER", UUID.randomUUID(), "UNREAD", validTime1, validTime1, null);

        String tokenA = TestJwtHelper.createToken(userA, "FARMER");
        HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders(tokenA));

        // 1. List all for userA (should return 2 valid, not expired, and not userB)
        ResponseEntity<PageResponse> resAll = http.exchange("/api/v1/notifications", HttpMethod.GET, entity, PageResponse.class);
        assertThat(resAll.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resAll.getBody()).isNotNull();
        assertThat(resAll.getBody().totalElements()).isEqualTo(2);

        // 2. Filter isRead = false
        ResponseEntity<PageResponse> resUnread = http.exchange("/api/v1/notifications?isRead=false", HttpMethod.GET, entity, PageResponse.class);
        assertThat(resUnread.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resUnread.getBody().totalElements()).isEqualTo(1);

        // 3. Filter type = MESSAGE_CREATED
        ResponseEntity<PageResponse> resType = http.exchange("/api/v1/notifications?type=MESSAGE_CREATED", HttpMethod.GET, entity, PageResponse.class);
        assertThat(resType.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resType.getBody().totalElements()).isEqualTo(1);
    }

    @Test
    void getNotificationById_OwnVsOther_AdminScoping() {
        UUID userA = UUID.randomUUID();
        UUID admin = UUID.randomUUID();
        doNothing().when(userServiceClient).verifyAccountActive(eq(userA));
        doNothing().when(userServiceClient).verifyAccountActive(eq(admin));

        UUID notiId = UUID.randomUUID();
        Instant validTime = FIXED_NOW.minus(Duration.ofDays(5));
        insertNotification(notiId, UUID.randomUUID(), userA, "CONTRACT_CREATED", "CONTRACT", UUID.randomUUID(), "UNREAD", validTime, validTime, null);

        // userA accesses own notification -> 200 OK
        String tokenA = TestJwtHelper.createToken(userA, "FARMER");
        HttpEntity<Void> entityA = new HttpEntity<>(createAuthHeaders(tokenA));
        ResponseEntity<NotificationDto> resA = http.exchange("/api/v1/notifications/" + notiId, HttpMethod.GET, entityA, NotificationDto.class);
        assertThat(resA.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resA.getBody()).isNotNull();
        assertThat(resA.getBody().notificationId()).isEqualTo(notiId);

        // admin accesses userA's notification -> 404 (Admin cannot view other's)
        String tokenAdmin = TestJwtHelper.createToken(admin, "ADMIN");
        HttpEntity<Void> entityAdmin = new HttpEntity<>(createAuthHeaders(tokenAdmin));
        ResponseEntity<ErrorResponse> resAdmin = http.exchange("/api/v1/notifications/" + notiId, HttpMethod.GET, entityAdmin, ErrorResponse.class);
        assertThat(resAdmin.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // Non-existent ID -> 404
        ResponseEntity<ErrorResponse> resNonExist = http.exchange("/api/v1/notifications/" + UUID.randomUUID(), HttpMethod.GET, entityA, ErrorResponse.class);
        assertThat(resNonExist.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void markAsRead_Idempotent_PreservesFirstReadAt() {
        UUID userA = UUID.randomUUID();
        doNothing().when(userServiceClient).verifyAccountActive(eq(userA));

        UUID notiId = UUID.randomUUID();
        Instant createdAt = FIXED_NOW.minus(Duration.ofDays(10));
        insertNotification(notiId, UUID.randomUUID(), userA, "OFFER_CREATED", "OFFER", UUID.randomUUID(), "UNREAD", createdAt, createdAt, null);

        String tokenA = TestJwtHelper.createToken(userA, "TRADER");
        HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders(tokenA));

        // 1. Mark as read first time
        ResponseEntity<MarkReadResponse> res1 = http.exchange(
                "/api/v1/notifications/" + notiId + "/read", HttpMethod.PATCH, entity, MarkReadResponse.class
        );
        assertThat(res1.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res1.getBody()).isNotNull();
        assertThat(res1.getBody().status().name()).isEqualTo("READ");
        Instant firstReadAt = res1.getBody().readAt();
        assertThat(firstReadAt).isNotNull();

        // 2. Mark as read second time -> remains READ, preserves firstReadAt
        ResponseEntity<MarkReadResponse> res2 = http.exchange(
                "/api/v1/notifications/" + notiId + "/read", HttpMethod.PATCH, entity, MarkReadResponse.class
        );
        assertThat(res2.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res2.getBody().readAt()).isEqualTo(firstReadAt);
    }

    @Test
    void getUnreadCount_CalculatesOnlyActiveUnreadWithin90Days() {
        UUID userA = UUID.randomUUID();
        doNothing().when(userServiceClient).verifyAccountActive(eq(userA));

        Instant valid1 = FIXED_NOW.minus(Duration.ofDays(1));
        Instant valid2 = FIXED_NOW.minus(Duration.ofDays(50));
        Instant expired = FIXED_NOW.minus(Duration.ofDays(92));

        // 2 unread valid
        insertNotification(UUID.randomUUID(), UUID.randomUUID(), userA, "OFFER_CREATED", "OFFER", UUID.randomUUID(), "UNREAD", valid1, valid1, null);
        insertNotification(UUID.randomUUID(), UUID.randomUUID(), userA, "MESSAGE_CREATED", "CONVERSATION", UUID.randomUUID(), "UNREAD", valid2, valid2, null);
        // 1 read valid
        insertNotification(UUID.randomUUID(), UUID.randomUUID(), userA, "DEPOSIT_PAID", "DEPOSIT", UUID.randomUUID(), "READ", valid1, valid1, valid1);
        // 1 unread expired (>90 days)
        insertNotification(UUID.randomUUID(), UUID.randomUUID(), userA, "OFFER_CREATED", "OFFER", UUID.randomUUID(), "UNREAD", expired, expired, null);

        String token = TestJwtHelper.createToken(userA, "FARMER");
        HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders(token));

        ResponseEntity<UnreadCountResponse> res = http.exchange(
                "/api/v1/notifications/unread-count", HttpMethod.GET, entity, UnreadCountResponse.class
        );
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().count()).isEqualTo(2);
    }
}
