package vn.ptit.soa.payment.contract;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.flywaydb.core.Flyway;

@EnabledIfEnvironmentVariable(named = "REVIEW_DB_URL", matches = ".+")
class PaymentOutboxOrderingIntegrationTest {
    @Test
    void leasedAndDeferredHeadBlockOnlyTheirAggregate() {
        var ds = new DriverManagerDataSource(System.getenv("REVIEW_DB_URL"),
                "payment_owner", System.getenv("REVIEW_DB_PASSWORD"));
        Flyway.configure().dataSource(ds).locations("classpath:db/learning").load().migrate();
        var jdbc = new JdbcTemplate(ds);
        var repo = new PaymentOutboxRelayRepository(jdbc);
        String first = UUID.randomUUID().toString(), second = UUID.randomUUID().toString();
        String other = UUID.randomUUID().toString(), aggregate = UUID.randomUUID().toString();
        String relay = UUID.randomUUID().toString();
        try {
            for (String id : new String[]{first, second, other}) {
                jdbc.update("INSERT INTO learning.outbox(event_id,event_type,aggregate_id,topic,event_key,payload,created_at) VALUES (?::uuid,'CONTRACT_STATUS_CHANGED',?::uuid,'test',?::uuid,'{}', '2026-01-01T00:00:00Z')",
                        id, id.equals(other) ? other : aggregate, aggregate);
            }
            assertEquals(first, repo.claim(relay).orElseThrow().eventId());
            assertEquals(other, repo.claim(relay).orElseThrow().eventId());
            assertTrue(repo.claim(relay).isEmpty(), "Leased head must block the second event");
            repo.defer(first, relay);
            assertTrue(repo.claim(relay).isEmpty(), "Deferred head must still block its successor");
            jdbc.update("UPDATE learning.outbox SET lease_until=clock_timestamp()-interval '1 second' WHERE event_id=?::uuid", first);
            assertEquals(first, repo.claim(relay).orElseThrow().eventId());
            assertTrue(repo.markPublished(first, relay));
            assertEquals(second, repo.claim(relay).orElseThrow().eventId());
        } finally {
            jdbc.update("DELETE FROM learning.outbox WHERE event_id IN (?::uuid,?::uuid,?::uuid)", first, second, other);
        }
    }
}
