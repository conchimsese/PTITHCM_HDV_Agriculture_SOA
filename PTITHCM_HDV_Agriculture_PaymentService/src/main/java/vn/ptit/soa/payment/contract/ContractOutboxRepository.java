package vn.ptit.soa.payment.contract;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class ContractOutboxRepository {
    private static final String TOPIC = "soa.contract.lifecycle.v1";
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public ContractOutboxRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public void created(Contract contract, Instant now) {
        save("CONTRACT_CREATED", contract, contract.traderId(), now, Map.of(
                "contractId", contract.contractId(), "offerId", contract.offerId(),
                "farmerId", contract.farmerId(), "traderId", contract.traderId(),
                "status", contract.status()));
    }

    public void statusChanged(Contract contract, String previousStatus, String actorId, Instant now) {
        save("CONTRACT_STATUS_CHANGED", contract, actorId, now, Map.of(
                "contractId", contract.contractId(), "farmerId", contract.farmerId(),
                "traderId", contract.traderId(), "previousStatus", previousStatus,
                "status", contract.status(), "stateVersion", contract.stateVersion()));
    }

    private void save(String type, Contract contract, String actorId, Instant now,
            Map<String, Object> data) {
        String eventId = UUID.randomUUID().toString();
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", type);
        envelope.put("eventVersion", 1);
        envelope.put("sourceService", "payment-service");
        envelope.put("occurredAt", now.toString());
        envelope.put("actorId", actorId);
        envelope.put("recipientIds", List.of(contract.farmerId(), contract.traderId()));
        envelope.put("referenceType", "CONTRACT");
        envelope.put("referenceId", contract.contractId());
        envelope.put("data", data);
        try {
            jdbc.update("""
                    INSERT INTO learning.outbox
                    (event_id,event_type,aggregate_id,topic,event_key,payload,created_at)
                    VALUES (?::uuid,?,?::uuid,?,?::uuid,?::jsonb,?)
                    """, eventId, type, contract.contractId(), TOPIC, contract.contractId(),
                    json.writeValueAsString(envelope), java.sql.Timestamp.from(now));
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Cannot serialize contract event.", invalid);
        }
    }
}
