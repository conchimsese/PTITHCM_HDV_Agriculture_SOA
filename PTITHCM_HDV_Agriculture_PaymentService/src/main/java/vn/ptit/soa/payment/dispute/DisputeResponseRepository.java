package vn.ptit.soa.payment.dispute;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class DisputeResponseRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public DisputeResponseRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public void insert(DisputeResponse response) {
        try {
            jdbc.update("""
                    INSERT INTO learning.dispute_responses
                    (response_id,dispute_id,account_id,statement,evidence_refs,created_at)
                    VALUES (?::uuid,?::uuid,?::uuid,?,?::jsonb,?)
                    """, response.responseId(), response.disputeId(), response.accountId(),
                    response.statement(), json.writeValueAsString(response.evidenceRefs()),
                    Timestamp.from(response.createdAt()));
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Cannot serialize evidence references.", invalid);
        }
    }

    public List<DisputeResponse> findByDispute(String disputeId) {
        return jdbc.query("""
                SELECT * FROM learning.dispute_responses
                WHERE dispute_id=?::uuid ORDER BY created_at,response_id
                """, (rs, row) -> {
                    try {
                        return new DisputeResponse(rs.getString("response_id"),
                                rs.getString("dispute_id"), rs.getString("account_id"),
                                rs.getString("statement"),
                                json.readValue(rs.getString("evidence_refs"), new TypeReference<List<String>>() {}),
                                rs.getTimestamp("created_at").toInstant());
                    } catch (JsonProcessingException invalid) {
                        throw new IllegalStateException("Cannot read evidence references.", invalid);
                    }
                }, disputeId);
    }
}
