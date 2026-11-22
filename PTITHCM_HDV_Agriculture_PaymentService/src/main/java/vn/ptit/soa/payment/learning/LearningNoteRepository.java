package vn.ptit.soa.payment.learning;

import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class LearningNoteRepository {
    private final JdbcTemplate jdbc;
    public LearningNoteRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public LearningNote save(LearningNote note) {
        jdbc.update("INSERT INTO learning.notes (id,content,created_at) VALUES (?::uuid,?,?)",
                note.id(), note.content(), java.sql.Timestamp.from(note.createdAt()));
        return note;
    }

    public Optional<LearningNote> find(String id) {
        return jdbc.query("SELECT id,content,created_at FROM learning.notes WHERE id=?::uuid",
                (rs, index) -> new LearningNote(rs.getString("id"), rs.getString("content"),
                        rs.getTimestamp("created_at").toInstant()), id).stream().findFirst();
    }
}
