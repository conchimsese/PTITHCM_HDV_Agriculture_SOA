package vn.ptit.soa.payment.dispute;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class AdminCompletionRepository {
    private final JdbcTemplate jdbc;

    public AdminCompletionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(String contractId, String disputeId, String adminId,
            long expectedVersion, String reason, List<String> evidenceRefs, Instant now) {
        jdbc.update("""
                INSERT INTO learning.admin_completions
                (contract_id,dispute_id,admin_id,expected_version,reason,evidence_refs,completed_at)
                VALUES (?::uuid,?::uuid,?::uuid,?,?,?::uuid[],?)
                """, contractId, disputeId, adminId, expectedVersion, reason,
                "{" + String.join(",", evidenceRefs) + "}", Timestamp.from(now));
    }

    public Optional<Audit> find(String contractId) {
        return jdbc.query("""
                SELECT dispute_id::text,admin_id::text,expected_version,reason,evidence_refs
                FROM learning.admin_completions WHERE contract_id=?::uuid
                """, (rs, row) -> new Audit(rs.getString(1), rs.getString(2), rs.getLong(3),
                        rs.getString(4), Arrays.stream((Object[]) rs.getArray(5).getArray())
                                .map(Object::toString).toList()), contractId).stream().findFirst();
    }

    public record Audit(String disputeId, String adminId, long expectedVersion,
            String reason, List<String> evidenceRefs) {}
}
