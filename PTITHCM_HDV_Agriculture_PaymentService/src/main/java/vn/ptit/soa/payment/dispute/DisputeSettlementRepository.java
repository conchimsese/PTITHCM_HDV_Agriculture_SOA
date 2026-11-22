package vn.ptit.soa.payment.dispute;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class DisputeSettlementRepository {
    private final JdbcTemplate jdbc;

    public DisputeSettlementRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<SettlementTerms> findTerms(String decisionId) {
        return jdbc.query("""
                SELECT liable_account_id::text,violation_code,penalty_points
                FROM learning.dispute_settlements WHERE decision_id=?::uuid
                """, (rs, row) -> new SettlementTerms(rs.getString(1), rs.getString(2),
                rs.getBigDecimal(3)), decisionId).stream().findFirst();
    }

    public void insert(String decisionId, String trackingId, String contractId,
            String adminId, String liableAccountId, String violationCode,
            BigDecimal penaltyPoints, String beneficiaryId, String disposition,
            BigDecimal depositAmount, BigDecimal penaltyRate,
            BigDecimal penaltyAmount, Instant now) {
        jdbc.update("""
                INSERT INTO learning.dispute_settlements
                (decision_id,payment_tracking_id,contract_id,admin_id,liable_account_id,
                 violation_code,penalty_points,beneficiary_id,
                 disposition,deposit_amount,penalty_rate,penalty_amount,settled_at)
                VALUES (?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?,?,?::uuid,?,?,?,?,?)
                """, decisionId, trackingId, contractId, adminId, liableAccountId,
                violationCode, penaltyPoints, beneficiaryId,
                disposition, depositAmount, penaltyRate, penaltyAmount, Timestamp.from(now));
    }

    public record SettlementTerms(String liableAccountId, String violationCode,
            BigDecimal penaltyPoints) {}
}
