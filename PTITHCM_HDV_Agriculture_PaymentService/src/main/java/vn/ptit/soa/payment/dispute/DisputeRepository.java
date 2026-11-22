package vn.ptit.soa.payment.dispute;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class DisputeRepository {
    private final JdbcTemplate jdbc;

    public DisputeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(Dispute dispute) {
        jdbc.update("""
                INSERT INTO learning.disputes
                (dispute_id,contract_id,opened_by,reason_code,description,status,deposit_hold,
                 state_version,decision_version,created_at,updated_at)
                VALUES (?::uuid,?::uuid,?::uuid,?,?,?,?,?,?,?,?)
                """, dispute.disputeId(), dispute.contractId(), dispute.openedBy(),
                dispute.reasonCode(), dispute.description(), dispute.status(), dispute.depositHold(),
                dispute.stateVersion(), dispute.decisionVersion(),
                Timestamp.from(dispute.createdAt()), Timestamp.from(dispute.updatedAt()));
    }

    public Optional<Dispute> findById(String id) {
        return jdbc.query("SELECT * FROM learning.disputes WHERE dispute_id=?::uuid",
                this::map, id).stream().findFirst();
    }

    public Optional<Dispute> findByIdForUpdate(String id) {
        return jdbc.query("SELECT * FROM learning.disputes WHERE dispute_id=?::uuid FOR UPDATE",
                this::map, id).stream().findFirst();
    }

    public List<Dispute> findForIndependentAdmin(String adminId, String status,
            Instant beforeCreatedAt, String beforeId, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT d.* FROM learning.disputes d
                JOIN learning.contracts c ON c.contract_id=d.contract_id
                WHERE c.farmer_id<>?::uuid AND c.trader_id<>?::uuid
                """);
        List<Object> params = new ArrayList<>();
        params.add(adminId);
        params.add(adminId);
        if (status != null) {
            sql.append(" AND d.status=?");
            params.add(status);
        }
        if (beforeCreatedAt != null) {
            sql.append(" AND (d.created_at,d.dispute_id) < (?,?::uuid)");
            params.add(Timestamp.from(beforeCreatedAt));
            params.add(beforeId);
        }
        sql.append(" ORDER BY d.created_at DESC,d.dispute_id DESC LIMIT ?");
        params.add(limit);
        return jdbc.query(sql.toString(), this::map, params.toArray());
    }

    public boolean activeExists(String contractId) {
        Boolean present = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM learning.disputes
                    WHERE contract_id=?::uuid AND status IN ('OPEN','UNDER_REVIEW'))
                """, Boolean.class, contractId);
        return Boolean.TRUE.equals(present);
    }

    public Optional<Dispute> findLatestForContract(String contractId) {
        return jdbc.query("""
                SELECT * FROM learning.disputes WHERE contract_id=?::uuid
                ORDER BY created_at DESC,dispute_id DESC LIMIT 1
                """, this::map, contractId).stream().findFirst();
    }

    public void review(String id, String previousAdmin, String adminId, String note,
            Instant responseDueAt, long version, Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.disputes
                SET status='UNDER_REVIEW',assigned_admin_id=?::uuid,response_due_at=?,
                    state_version=?,updated_at=?
                WHERE dispute_id=?::uuid AND status IN ('OPEN','UNDER_REVIEW')
                """, adminId, Timestamp.from(responseDueAt), version, Timestamp.from(now), id);
        if (changed != 1) throw new IllegalStateException("Dispute was not reviewed.");
        jdbc.update("""
                INSERT INTO learning.dispute_reviews
                (review_id,dispute_id,previous_admin_id,admin_id,note,created_at)
                VALUES (?::uuid,?::uuid,?::uuid,?::uuid,?,?)
                """, UUID.randomUUID().toString(), id, previousAdmin, adminId,
                note, Timestamp.from(now));
    }

    public void resolve(String id, String outcome, long version, long decisionVersion, Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.disputes
                SET status='RESOLVED',deposit_hold=false,resolved_at=?,outcome=?,
                    state_version=?,decision_version=?,updated_at=?
                WHERE dispute_id=?::uuid AND status='UNDER_REVIEW'
                """, Timestamp.from(now), outcome, version, decisionVersion,
                Timestamp.from(now), id);
        if (changed != 1) throw new IllegalStateException("Dispute was not resolved.");
    }

    public void recordReversal(String id, long expectedDecisionVersion, Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.disputes
                SET decision_version=decision_version+1,state_version=state_version+1,updated_at=?
                WHERE dispute_id=?::uuid AND status='RESOLVED' AND decision_version=?
                """, Timestamp.from(now), id, expectedDecisionVersion);
        if (changed != 1) throw new IllegalStateException("Dispute decision version changed.");
    }

    public void insertDecision(DisputeDecision decision, Instant now) {
        jdbc.update("""
                INSERT INTO learning.dispute_decisions
                (decision_id,dispute_id,admin_id,expected_version,outcome,
                 deposit_disposition,reason,evidence_refs,created_at)
                VALUES (?::uuid,?::uuid,?::uuid,?,?,?,?,?::uuid[],?)
                """, decision.decisionId(), decision.disputeId(), decision.adminId(),
                decision.expectedVersion(), decision.outcome(),
                decision.depositDisposition(), decision.reason(),
                "{" + String.join(",", decision.evidenceRefs()) + "}", Timestamp.from(now));
    }

    public Optional<DisputeDecision> findDecision(String decisionId) {
        return jdbc.query("""
                SELECT decision_id::text,dispute_id::text,admin_id::text,expected_version,
                       outcome,deposit_disposition,reason,evidence_refs
                FROM learning.dispute_decisions WHERE decision_id=?::uuid
                """, this::mapDecision, decisionId).stream().findFirst();
    }

    public Optional<DisputeDecision> findDecisionForDispute(String disputeId) {
        return jdbc.query("""
                SELECT decision_id::text,dispute_id::text,admin_id::text,expected_version,
                       outcome,deposit_disposition,reason,evidence_refs
                FROM learning.dispute_decisions WHERE dispute_id=?::uuid
                """, this::mapDecision, disputeId).stream().findFirst();
    }

    private DisputeDecision mapDecision(ResultSet rs, int row) throws SQLException {
        return new DisputeDecision(rs.getString(1), rs.getString(2), rs.getString(3),
                rs.getLong(4), rs.getString(5), rs.getString(6), rs.getString(7),
                java.util.Arrays.stream((Object[]) rs.getArray(8).getArray())
                        .map(Object::toString).toList());
    }

    private Dispute map(ResultSet rs, int row) throws SQLException {
        Timestamp responseDueAt = rs.getTimestamp("response_due_at");
        Timestamp resolvedAt = rs.getTimestamp("resolved_at");
        return new Dispute(rs.getString("dispute_id"), rs.getString("contract_id"),
                rs.getString("opened_by"), rs.getString("reason_code"),
                rs.getString("description"), rs.getString("status"),
                rs.getBoolean("deposit_hold"), rs.getString("assigned_admin_id"),
                responseDueAt == null ? null : responseDueAt.toInstant(),
                resolvedAt == null ? null : resolvedAt.toInstant(), rs.getString("outcome"),
                rs.getLong("state_version"), rs.getLong("decision_version"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }
}
