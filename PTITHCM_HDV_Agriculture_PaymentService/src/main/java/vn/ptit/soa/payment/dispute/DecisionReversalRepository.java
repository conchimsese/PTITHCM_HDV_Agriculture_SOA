package vn.ptit.soa.payment.dispute;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class DecisionReversalRepository {
    private final JdbcTemplate jdbc;

    public DecisionReversalRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<DecisionReversal> findByOriginal(String decisionId) {
        return jdbc.query("""
                SELECT * FROM learning.decision_reversals
                WHERE original_decision_id=?::uuid
                """, this::map, decisionId).stream().findFirst();
    }

    public Optional<DecisionReversal> findByDispute(String disputeId) {
        return jdbc.query("""
                SELECT * FROM learning.decision_reversals WHERE dispute_id=?::uuid
                """, this::map, disputeId).stream().findFirst();
    }

    public void insert(DecisionReversal reversal) {
        jdbc.update("""
                INSERT INTO learning.decision_reversals
                (reversal_decision_id,original_decision_id,dispute_id,admin_id,
                 reason,evidence_refs,created_at)
                VALUES (?::uuid,?::uuid,?::uuid,?::uuid,?,?::uuid[],?)
                """, reversal.reversalDecisionId(), reversal.originalDecisionId(),
                reversal.disputeId(), reversal.adminId(), reversal.reason(),
                "{" + String.join(",", reversal.evidenceRefs()) + "}",
                Timestamp.from(reversal.createdAt()));
    }

    private DecisionReversal map(ResultSet rs, int row) throws SQLException {
        return new DecisionReversal(rs.getString("reversal_decision_id"),
                rs.getString("original_decision_id"), rs.getString("dispute_id"),
                rs.getString("admin_id"), rs.getString("reason"),
                Arrays.stream((Object[]) rs.getArray("evidence_refs").getArray())
                        .map(Object::toString).toList(),
                rs.getTimestamp("created_at").toInstant());
    }
}
