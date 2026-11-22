package vn.ptit.soa.chat.learning;

import java.util.Optional;
import java.time.Instant;
import org.bson.Document;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class LearningNoteRepository {
    private final MongoTemplate mongo;
    public LearningNoteRepository(MongoTemplate mongo) { this.mongo = mongo; }

    public LearningNote save(LearningNote note) {
        mongo.insert(new Document("_id", note.id()).append("content", note.content())
                .append("created_at", java.util.Date.from(note.createdAt())), "learning_notes");
        return note;
    }

    public Optional<LearningNote> find(String id) {
        Document row = mongo.findById(id, Document.class, "learning_notes");
        return row == null ? Optional.empty() : Optional.of(new LearningNote(
                row.getString("_id"), row.getString("content"), row.getDate("created_at").toInstant()));
    }
}
