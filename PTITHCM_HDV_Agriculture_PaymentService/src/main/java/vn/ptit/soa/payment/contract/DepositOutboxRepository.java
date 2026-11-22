package vn.ptit.soa.payment.contract;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class DepositOutboxRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public DepositOutboxRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public void paid(Contract contract, PaymentTracking tracking, Instant now) {
        save("DEPOSIT_PAID", contract, tracking, contract.traderId(), now, Map.of(
                "depositId", tracking.paymentTrackingId(),
                "paymentId", tracking.paymentTrackingId(),
                "contractId", contract.contractId(),
                "farmerId", contract.farmerId(),
                "traderId", contract.traderId(),
                "amount", tracking.depositAmount().toPlainString(),
                "currency", "VND"));
    }

    public void statusChanged(Contract contract, PaymentTracking tracking,
            String previousStatus, String actorId, Instant now) {
        save("DEPOSIT_STATUS_CHANGED", contract, tracking, actorId, now, Map.of(
                "depositId", tracking.paymentTrackingId(),
                "contractId", contract.contractId(),
                "farmerId", contract.farmerId(),
                "traderId", contract.traderId(),
                "previousStatus", previousStatus, "status", tracking.status(),
                "stateVersion", tracking.stateVersion()));
    }

    private void save(String eventType, Contract contract, PaymentTracking tracking,
            String actorId, Instant now, Map<String, Object> data) {
        String eventId = UUID.randomUUID().toString();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventId", eventId);
        payload.put("eventType", eventType);
        payload.put("eventVersion", 1);
        payload.put("sourceService", "payment-service");
        payload.put("occurredAt", now.toString());
        payload.put("actorId", actorId);
        payload.put("recipientIds", List.of(contract.farmerId(), contract.traderId()));
        payload.put("referenceType", "DEPOSIT");
        payload.put("referenceId", tracking.paymentTrackingId());
        payload.put("data", data);
        try {
            jdbc.update("""
                    INSERT INTO learning.outbox
                    (event_id,event_type,aggregate_id,topic,event_key,payload,created_at)
                    VALUES (?::uuid,?,?::uuid,?,?::uuid,?::jsonb,?)
                    """, eventId, eventType, tracking.paymentTrackingId(),
                    "soa.payment.deposit.v1", tracking.paymentTrackingId(),
                    json.writeValueAsString(payload), Timestamp.from(now));
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Cannot serialize deposit event.", invalid);
        }
    }
}
