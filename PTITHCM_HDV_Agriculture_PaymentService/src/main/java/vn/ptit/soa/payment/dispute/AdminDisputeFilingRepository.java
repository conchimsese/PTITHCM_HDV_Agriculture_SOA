package vn.ptit.soa.payment.dispute;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class AdminDisputeFilingRepository {
    private final JdbcTemplate jdbc;

    public AdminDisputeFilingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(String disputeId, String adminId, String participantId,
            String verificationNote, Instant now) {
        jdbc.update("""
                INSERT INTO learning.admin_dispute_filings
                (dispute_id,admin_id,on_behalf_of_account_id,verification_note,created_at)
                VALUES (?::uuid,?::uuid,?::uuid,?,?)
                """, disputeId, adminId, participantId, verificationNote, Timestamp.from(now));
    }

    public Optional<Filing> find(String disputeId) {
        return jdbc.query("""
                SELECT dispute_id::text,admin_id::text,on_behalf_of_account_id::text,
                       verification_note,created_at
                FROM learning.admin_dispute_filings WHERE dispute_id=?::uuid
                """, (rs, row) -> new Filing(rs.getString(1), rs.getString(2),
                        rs.getString(3), rs.getString(4), rs.getTimestamp(5).toInstant()),
                disputeId).stream().findFirst();
    }

    public record Filing(String disputeId, String adminId, String onBehalfOfAccountId,
            String verificationNote, Instant createdAt) {}
}
