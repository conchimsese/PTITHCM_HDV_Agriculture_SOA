package vn.soa.notification.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import vn.soa.notification.repository.NotificationReceiptRepository;
import vn.soa.notification.repository.NotificationRepository;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class NotificationCleanupJobTest {

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

    private static final Instant FIXED_NOW = Instant.parse("2026-10-27T10:00:00Z");

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        public Clock fixedClock() {
            return Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationReceiptRepository receiptRepository;

    @Autowired
    private NotificationCleanupJob cleanupJob;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        receiptRepository.deleteAll();
    }

    private void insertNotification(UUID notiId, UUID eventId, UUID recipientId, Instant createdAt) {
        jdbcTemplate.update("""
                INSERT INTO notifications (notification_id, event_id, recipient_id, type, title, content,
                    source_service, source_event, reference_type, reference_id, status, occurred_at, created_at, read_at)
                VALUES (?, ?, ?, 'OFFER_CREATED', 'Test', 'Test Content', 'trading-service', 'OFFER_CREATED',
                    'OFFER', ?, 'UNREAD', ?, ?, null)
                """, notiId, eventId, recipientId, UUID.randomUUID(),
                java.sql.Timestamp.from(createdAt),
                java.sql.Timestamp.from(createdAt));
    }

    private void insertReceipt(UUID eventId, UUID recipientId, Instant processedAt) {
        jdbcTemplate.update("""
                INSERT INTO notification_receipts (event_id, recipient_id, processed_at, payload_hash)
                VALUES (?, ?, ?, ?)
                """, eventId, recipientId, java.sql.Timestamp.from(processedAt), "a".repeat(64));
    }

    @Test
    void cleanupExpiredNotifications_DeletesOnlyOlderThan90Days_PreservesReceipts() {
        Instant validTime = FIXED_NOW.minus(Duration.ofDays(89));
        Instant expiredTime1 = FIXED_NOW.minus(Duration.ofDays(91));
        Instant expiredTime2 = FIXED_NOW.minus(Duration.ofDays(100));

        UUID user = UUID.randomUUID();
        UUID eventValid = UUID.randomUUID();
        UUID eventExpired1 = UUID.randomUUID();
        UUID eventExpired2 = UUID.randomUUID();

        // Insert 1 valid notification + receipt
        insertNotification(UUID.randomUUID(), eventValid, user, validTime);
        insertReceipt(eventValid, user, validTime);

        // Insert 2 expired notifications + receipts
        insertNotification(UUID.randomUUID(), eventExpired1, user, expiredTime1);
        insertReceipt(eventExpired1, user, expiredTime1);

        insertNotification(UUID.randomUUID(), eventExpired2, user, expiredTime2);
        insertReceipt(eventExpired2, user, expiredTime2);

        assertThat(notificationRepository.count()).isEqualTo(3);
        assertThat(receiptRepository.count()).isEqualTo(3);

        // Run cleanup job
        int deleted = cleanupJob.cleanupExpiredNotifications();

        assertThat(deleted).isEqualTo(2);
        assertThat(notificationRepository.count()).isEqualTo(1);

        // Crucial invariant: Receipts must NEVER be deleted in MVP cleanup
        assertThat(receiptRepository.count()).isEqualTo(3);
    }
}
