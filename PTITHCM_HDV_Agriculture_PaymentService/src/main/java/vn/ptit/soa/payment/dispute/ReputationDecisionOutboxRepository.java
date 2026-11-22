package vn.ptit.soa.payment.dispute;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.ptit.soa.payment.contract.Contract;

@Repository
@Profile("database-learning")
public class ReputationDecisionOutboxRepository {
    private static final String TOPIC = "soa.payment.reputation-decision.v1";
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public ReputationDecisionOutboxRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public void penalty(Contract contract, String decisionId, long decisionVersion,
            String liableAccountId, String violationCode, BigDecimal points,
            String adminId, Instant now) {
        String counterpartyId = liableAccountId.equals(contract.farmerId())
                ? contract.traderId() : contract.farmerId();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("decisionId", decisionId);
        data.put("decisionVersion", decisionVersion);
        data.put("contractId", contract.contractId());
        data.put("accountId", liableAccountId);
        data.put("counterpartyId", counterpartyId);
        data.put("action", "PENALTY");
        data.put("violationCode", violationCode);
        data.put("requestedDelta", points.negate());
        data.put("reasonCode", violationCode);
        data.put("effectiveAt", now.toString());
        save(contract, liableAccountId, adminId, now, data);
    }

    public void reversePenalty(Contract contract, DecisionReversal reversal,
            long decisionVersion) {
        var originals = jdbc.query("""
                SELECT event_key::text,payload->'data'->>'violationCode',
                       (payload->'data'->>'requestedDelta')::numeric
                FROM learning.outbox
                WHERE topic=? AND aggregate_id=?::uuid
                  AND payload->'data'->>'decisionId'=?
                  AND payload->'data'->>'action'='PENALTY'
                """, (rs, row) -> new OriginalPenalty(rs.getString(1), rs.getString(2),
                        rs.getBigDecimal(3)), TOPIC, contract.contractId(),
                reversal.originalDecisionId());
        if (originals.isEmpty()) return; // Historical decisions without a producer event are audit-only.
        if (originals.size() != 1) throw new IllegalStateException("Ambiguous original penalty event.");
        OriginalPenalty original = originals.getFirst();
        String account = original.accountId();
        if (!account.equals(contract.farmerId()) && !account.equals(contract.traderId())) {
            throw new IllegalStateException("Original penalty account does not belong to Contract.");
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("decisionId", reversal.reversalDecisionId());
        data.put("decisionVersion", decisionVersion);
        data.put("originalDecisionId", reversal.originalDecisionId());
        data.put("contractId", contract.contractId());
        data.put("accountId", account);
        data.put("counterpartyId", account.equals(contract.farmerId())
                ? contract.traderId() : contract.farmerId());
        data.put("action", "REVERSAL");
        data.put("violationCode", original.violationCode());
        // Requested only: User must reverse its saved actualDelta, not apply this amount blindly.
        data.put("requestedDelta", original.requestedDelta().negate());
        data.put("reasonCode", "DECISION_REVERSED");
        data.put("effectiveAt", reversal.createdAt().toString());
        save(contract, account, reversal.adminId(), reversal.createdAt(), data);
    }

    private record OriginalPenalty(String accountId, String violationCode,
            BigDecimal requestedDelta) {}

    public void completionReward(Contract contract, String decisionId, String accountId, Instant now) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("decisionId", decisionId);
        data.put("decisionVersion", 1);
        data.put("contractId", contract.contractId());
        data.put("accountId", accountId);
        data.put("counterpartyId", accountId.equals(contract.farmerId())
                ? contract.traderId() : contract.farmerId());
        data.put("action", "COMPLETION_REWARD");
        data.put("requestedDelta", new BigDecimal("0.5"));
        data.put("reasonCode", "CONTRACT_COMPLETED");
        data.put("effectiveAt", now.toString());
        save(contract, accountId, null, now, data);
    }

    public void reverseCompletionReward(Contract contract, String originalDecisionId,
            String accountId, String adminId, Instant now) {
        String reversalDecisionId = UUID.randomUUID().toString();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("decisionId", reversalDecisionId);
        data.put("decisionVersion", 1);
        data.put("originalDecisionId", originalDecisionId);
        data.put("contractId", contract.contractId());
        data.put("accountId", accountId);
        data.put("counterpartyId", accountId.equals(contract.farmerId())
                ? contract.traderId() : contract.farmerId());
        data.put("action", "REVERSAL");
        data.put("violationCode", null);
        data.put("requestedDelta", new BigDecimal("-0.5"));
        data.put("reasonCode", "LATE_VIOLATION_REWARD_REVOKED");
        data.put("effectiveAt", now.toString());
        save(contract, accountId, adminId, now, data);
    }

    private void save(Contract contract, String accountId, String adminId, Instant now,
            Map<String, Object> data) {
        String eventId = UUID.randomUUID().toString();
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", "CONTRACT_REPUTATION_DECIDED");
        envelope.put("eventVersion", 1);
        envelope.put("sourceService", "payment-service");
        envelope.put("occurredAt", now.toString());
        envelope.put("actorId", adminId);
        envelope.put("recipientIds", List.of(accountId));
        envelope.put("referenceType", "CONTRACT");
        envelope.put("referenceId", contract.contractId());
        envelope.put("data", data);
        try {
            jdbc.update("""
                    INSERT INTO learning.outbox
                    (event_id,event_type,aggregate_id,topic,event_key,payload,created_at)
                    VALUES (?::uuid,?,?::uuid,?,?::uuid,?::jsonb,?)
                    """, eventId, "CONTRACT_REPUTATION_DECIDED", contract.contractId(),
                    TOPIC, accountId, json.writeValueAsString(envelope), Timestamp.from(now));
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Cannot serialize reputation decision event.", invalid);
        }
    }
}
