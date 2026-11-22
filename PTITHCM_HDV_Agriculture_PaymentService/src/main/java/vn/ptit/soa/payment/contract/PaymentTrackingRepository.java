package vn.ptit.soa.payment.contract;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class PaymentTrackingRepository {
    private final JdbcTemplate jdbc;

    public PaymentTrackingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public PaymentTracking insert(PaymentTracking tracking) {
        jdbc.update("""
                INSERT INTO learning.payment_tracking
                (payment_tracking_id,contract_id,deposit_rate,deposit_amount,status,
                 delivery_date,dispute_hold,state_version,created_at,updated_at)
                VALUES (?::uuid,?::uuid,?,?,?,?,?,?,?,?)
                """, tracking.paymentTrackingId(), tracking.contractId(),
                tracking.depositRate(), tracking.depositAmount(), tracking.status(),
                Timestamp.from(tracking.deliveryDate()), tracking.disputeHold(),
                tracking.stateVersion(), Timestamp.from(tracking.createdAt()),
                Timestamp.from(tracking.updatedAt()));
        return tracking;
    }

    public Optional<PaymentTracking> findByContractId(String contractId) {
        return jdbc.query("SELECT * FROM learning.payment_tracking WHERE contract_id=?::uuid",
                this::map, contractId).stream().findFirst();
    }

    public Optional<PaymentTracking> findByContractIdForUpdate(String contractId) {
        return jdbc.query("SELECT * FROM learning.payment_tracking WHERE contract_id=?::uuid FOR UPDATE",
                this::map, contractId).stream().findFirst();
    }

    public List<PaymentTracking> findForParticipant(String actorId, String status,
            Instant beforeCreatedAt, String beforeId, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT p.* FROM learning.payment_tracking p
                JOIN learning.contracts c ON c.contract_id=p.contract_id
                WHERE (c.farmer_id=?::uuid OR c.trader_id=?::uuid)
                """);
        List<Object> params = new ArrayList<>();
        params.add(actorId);
        params.add(actorId);
        if (status != null) {
            sql.append(" AND p.status=?");
            params.add(status);
        }
        if (beforeCreatedAt != null) {
            sql.append(" AND (p.created_at,p.payment_tracking_id) < (?,?::uuid)");
            params.add(Timestamp.from(beforeCreatedAt));
            params.add(beforeId);
        }
        sql.append(" ORDER BY p.created_at DESC,p.payment_tracking_id DESC LIMIT ?");
        params.add(limit);
        return jdbc.query(sql.toString(), this::map, params.toArray());
    }

    public void markLocked(String contractId, long stateVersion, java.time.Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.payment_tracking
                SET status='LOCKED',paid_at=?,state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status='PENDING'
                """, Timestamp.from(now), stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Deposit was not locked.");
    }

    public List<String> findDueContractIds(Instant cutoff, int limit) {
        return jdbc.queryForList("""
                SELECT contract_id::text FROM learning.payment_tracking
                WHERE status='LOCKED' AND dispute_hold=false AND delivery_date<=?
                ORDER BY delivery_date,payment_tracking_id LIMIT ?
                """, String.class, Timestamp.from(cutoff), limit);
    }

    public void markReleasable(String contractId, long stateVersion,
            Instant releaseAt, Instant completedAt, Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.payment_tracking
                SET status='RELEASABLE',release_at=?,completed_confirmed_at=?,
                    state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status='LOCKED' AND dispute_hold=false
                """, Timestamp.from(releaseAt),
                completedAt == null ? null : Timestamp.from(completedAt),
                stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Deposit was not made releasable.");
    }

    public void markCompletedAfterEligible(String contractId, long stateVersion, Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.payment_tracking
                SET completed_confirmed_at=?,state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status IN ('RELEASABLE','RELEASED')
                  AND completed_confirmed_at IS NULL
                """, Timestamp.from(now), stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Deposit completion was not recorded.");
    }

    public void markReleased(String contractId, long stateVersion, Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.payment_tracking
                SET status='RELEASED',released_at=?,state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status='RELEASABLE' AND dispute_hold=false
                """, Timestamp.from(now), stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Deposit was not released.");
    }

    public void setDisputeHold(String contractId, boolean hold, Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.payment_tracking
                SET dispute_hold=?,state_version=state_version+1,updated_at=?
                WHERE contract_id=?::uuid AND status IN ('LOCKED','RELEASABLE')
                  AND dispute_hold<>?
                """, hold, Timestamp.from(now), contractId, hold);
        if (changed != 1) throw new IllegalStateException("Deposit hold could not be changed.");
    }

    public void settleDispute(String contractId, String status, long stateVersion, Instant now) {
        if (!("FORFEITED".equals(status) || "REFUNDED".equals(status))) {
            throw new IllegalArgumentException("Unsupported deposit settlement.");
        }
        int changed = jdbc.update("""
                UPDATE learning.payment_tracking
                SET status=?,dispute_hold=false,state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status IN ('LOCKED','RELEASABLE')
                  AND dispute_hold=true
                """, status, stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Deposit was not settled.");
    }

    private PaymentTracking map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new PaymentTracking(rs.getString("payment_tracking_id"),
                        rs.getString("contract_id"), rs.getBigDecimal("deposit_rate"),
                        rs.getBigDecimal("deposit_amount"), rs.getString("status"),
                        rs.getTimestamp("paid_at") == null ? null : rs.getTimestamp("paid_at").toInstant(),
                        rs.getTimestamp("delivery_date").toInstant(),
                        rs.getTimestamp("completed_confirmed_at") == null ? null
                                : rs.getTimestamp("completed_confirmed_at").toInstant(),
                        rs.getTimestamp("release_at") == null ? null : rs.getTimestamp("release_at").toInstant(),
                        rs.getTimestamp("released_at") == null ? null : rs.getTimestamp("released_at").toInstant(),
                        rs.getBoolean("dispute_hold"), rs.getLong("state_version"),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant());
    }
}
