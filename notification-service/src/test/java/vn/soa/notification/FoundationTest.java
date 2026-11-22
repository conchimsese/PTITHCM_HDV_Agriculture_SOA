package vn.soa.notification;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.*;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class FoundationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("notification_db").withUsername("notification_app")
            .withPassword(UUID.randomUUID().toString());

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("DB_URL", POSTGRES::getJdbcUrl);
        registry.add("DB_USERNAME", POSTGRES::getUsername);
        registry.add("DB_PASSWORD", POSTGRES::getPassword);
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired Flyway flyway;
    @Autowired TestRestTemplate http;

    @Test
    void applicationHealthDoesNotExposeDetails() {
        var response = http.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo("{\"status\":\"UP\"}");
        assertThat(http.getForEntity("/actuator/env", String.class).getStatusCode().value()).isEqualTo(404);
        assertThat(http.getForEntity("/api/v1/notifications", String.class).getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void migrationValidatesAndDoesNotRepeat() {
        flyway.validate();
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("1");
    }

    @Test
    void constraintsAndDurableReceiptsFollowContract() {
        UUID event = UUID.randomUUID();
        UUID recipient = UUID.randomUUID();
        insert(event, recipient, "ACCOUNT_LOCKED", "ACCOUNT", "UNREAD", null);
        assertThatThrownBy(() -> insert(event, recipient, "ACCOUNT_LOCKED", "ACCOUNT", "UNREAD", null))
                .isInstanceOf(DataIntegrityViolationException.class);
        UUID other = UUID.randomUUID();
        insert(event, other, "ACCOUNT_UNLOCKED", "ACCOUNT", "READ", "2026-10-07T00:00:00Z");
        for (String type : new String[]{"OFFER_CREATED", "OFFER_ACCEPTED", "MESSAGE_CREATED",
                "CONTRACT_CREATED", "CONTRACT_STATUS_CHANGED", "DEPOSIT_PAID", "DEPOSIT_STATUS_CHANGED",
                "REPUTATION_CHANGED"}) {
            insert(UUID.randomUUID(), recipient, type, "ACCOUNT", "UNREAD", null);
        }
        assertThatThrownBy(() -> insert(UUID.randomUUID(), recipient, "RFQ_CREATED", "OFFER", "UNREAD", null))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(UUID.randomUUID(), recipient, "ACCOUNT_LOCKED", "OTHER", "UNREAD", null))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(UUID.randomUUID(), recipient, "ACCOUNT_LOCKED", "ACCOUNT", "READ", null))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(UUID.randomUUID(), recipient, "ACCOUNT_LOCKED", "ACCOUNT", "UNREAD", "2026-10-07T00:00:00Z"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(UUID.randomUUID(), recipient, "ACCOUNT_LOCKED", "ACCOUNT", "OTHER", null))
                .isInstanceOf(DataIntegrityViolationException.class);
        jdbc.update("INSERT INTO notification_receipts VALUES (?, ?, now(), ?)", event, recipient, "a".repeat(64));
        assertThatThrownBy(() -> jdbc.update("INSERT INTO notification_receipts VALUES (?, ?, now(), ?)",
                event, recipient, "a".repeat(64))).isInstanceOf(DataIntegrityViolationException.class);
        jdbc.update("DELETE FROM notifications WHERE event_id = ?", event);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM notification_receipts WHERE event_id = ?",
                Long.class, event)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.table_constraints "
                + "WHERE table_name IN ('notifications', 'notification_receipts') AND constraint_type = 'FOREIGN KEY'",
                Long.class)).isZero();
    }

    private void insert(UUID event, UUID recipient, String type, String reference, String status, String readAt) {
        jdbc.update("""
                INSERT INTO notifications (notification_id,event_id,recipient_id,type,title,content,
                    source_service,source_event,reference_type,reference_id,status,occurred_at,created_at,read_at)
                VALUES (?,?,?,?,?,?,'user-service',?,?,?, ?,now(),now(),cast(? AS timestamptz))
                """, UUID.randomUUID(), event, recipient, type, "Test", "Test", type,
                reference, UUID.randomUUID(), status, readAt);
    }
}
