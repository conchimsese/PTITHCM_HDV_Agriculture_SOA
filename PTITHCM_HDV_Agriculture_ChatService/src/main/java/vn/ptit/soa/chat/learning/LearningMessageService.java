package vn.ptit.soa.chat.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("learning")
public class LearningMessageService {
    public MessagePreview preview(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content must not be blank.");
        }
        if (content.codePointCount(0, content.length()) > 2000) {
            throw new IllegalArgumentException("content must be at most 2000 characters.");
        }
        return new MessagePreview(content, "TEXT", false);
    }

    public record MessagePreview(String content, String messageType, boolean persisted) {}
}
