package vn.ptit.soa.payment.learning;

import java.time.Instant;
import java.util.UUID;
import java.time.temporal.ChronoUnit;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@Profile("database-learning")
public class LearningNoteService {
    private final LearningNoteRepository repository;
    public LearningNoteService(LearningNoteRepository repository) { this.repository = repository; }

    public LearningNote create(String content) {
        if (content == null || content.isBlank() || content.codePointCount(0, content.length()) > 2000) {
            throw new IllegalArgumentException("content must contain 1-2000 characters and not be blank.");
        }
        return repository.save(new LearningNote(UUID.randomUUID().toString(), content,
                Instant.now().truncatedTo(ChronoUnit.MILLIS)));
    }

    public LearningNote find(String id) {
        try {
            if (!UUID.fromString(id).toString().equalsIgnoreCase(id)) throw new IllegalArgumentException();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("id must be a UUID.");
        }
        return repository.find(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
