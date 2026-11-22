package vn.ptit.soa.payment.dispute;

import java.sql.Timestamp;
import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.time.Instant;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class DisputeEvidenceRepository {
    private final JdbcTemplate jdbc;

    public DisputeEvidenceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(DisputeEvidence evidence) {
        jdbc.update("""
                INSERT INTO learning.dispute_evidence
                (evidence_id,dispute_id,uploader_id,source_account_id,storage_key,
                 content_type,size_bytes,sha256,description,created_at,attached_at)
                VALUES (?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?,?,?,?,?,?)
                """, evidence.evidenceId(), evidence.disputeId(), evidence.uploaderId(),
                evidence.sourceAccountId(), evidence.storageKey(), evidence.contentType(), evidence.sizeBytes(),
                evidence.sha256(), evidence.description(), Timestamp.from(evidence.createdAt()),
                Timestamp.from(evidence.attachedAt()));
    }

    public Optional<DisputeEvidence> find(String evidenceId, String disputeId) {
        return jdbc.query("""
                SELECT * FROM learning.dispute_evidence
                WHERE evidence_id=?::uuid AND dispute_id=?::uuid
                """, this::map,
                evidenceId, disputeId).stream().findFirst();
    }

    public List<DisputeEvidence> findPage(String disputeId, Instant beforeCreatedAt,
            String beforeId, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT * FROM learning.dispute_evidence WHERE dispute_id=?::uuid
                """);
        List<Object> params = new ArrayList<>();
        params.add(disputeId);
        if (beforeCreatedAt != null) {
            sql.append(" AND (created_at,evidence_id) < (?,?::uuid)");
            params.add(Timestamp.from(beforeCreatedAt));
            params.add(beforeId);
        }
        sql.append(" ORDER BY created_at DESC,evidence_id DESC LIMIT ?");
        params.add(limit);
        return jdbc.query(sql.toString(), this::map, params.toArray());
    }

    private DisputeEvidence map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new DisputeEvidence(rs.getString("evidence_id"),
                rs.getString("dispute_id"), rs.getString("uploader_id"),
                rs.getString("source_account_id"), rs.getString("storage_key"),
                rs.getString("content_type"), rs.getLong("size_bytes"),
                rs.getString("sha256"), rs.getString("description"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("attached_at").toInstant());
    }

    public boolean belongsTo(String evidenceId, String disputeId, String uploaderId) {
        Boolean exists = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM learning.dispute_evidence
                    WHERE evidence_id=?::uuid AND dispute_id=?::uuid AND uploader_id=?::uuid)
                """, Boolean.class, evidenceId, disputeId, uploaderId);
        return Boolean.TRUE.equals(exists);
    }

    public boolean belongsToDispute(String evidenceId, String disputeId) {
        Boolean exists = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM learning.dispute_evidence
                    WHERE evidence_id=?::uuid AND dispute_id=?::uuid)
                """, Boolean.class, evidenceId, disputeId);
        return Boolean.TRUE.equals(exists);
    }

    public boolean storageKeyExists(String storageKey) {
        Boolean exists = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM learning.dispute_evidence WHERE storage_key=?::uuid)
                """, Boolean.class, storageKey);
        return Boolean.TRUE.equals(exists);
    }
}
