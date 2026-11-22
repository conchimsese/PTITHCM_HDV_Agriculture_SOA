package vn.ptit.soa.chat.conversation;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageRepository;

@Service
@Profile("database-learning")
public class ConversationReadService {
    private final ConversationRepository conversations;
    private final ChatMessageRepository messages;

    public ConversationReadService(ConversationRepository conversations, ChatMessageRepository messages) {
        this.conversations = conversations;
        this.messages = messages;
    }

    public ConversationPage list(String viewerId, int limit, String cursor) {
        String viewer = uuid(viewerId);
        if (limit < 1 || limit > 100) throw new IllegalArgumentException("Limit must be between 1 and 100.");
        Position before = decode(cursor);
        List<Conversation> found = conversations.listForParticipant(viewer,
                before == null ? null : before.updatedAt(),
                before == null ? null : before.conversationId(), limit + 1);
        boolean more = found.size() > limit;
        List<Conversation> page = more ? found.subList(0, limit) : found;
        List<ConversationSummary> data = page.stream().map(room -> summary(room, viewer)).toList();
        return new ConversationPage(data, more ? encode(page.get(page.size() - 1)) : null);
    }

    public ConversationDetail detail(String conversationId, String viewerId) {
        String id = uuid(conversationId);
        String viewer = uuid(viewerId);
        Conversation room = conversations.findById(id)
                .orElseThrow(() -> new ConversationNotFoundException(id));
        if (!room.participantIds().contains(viewer)) throw new ConversationAccessDeniedException();
        return new ConversationDetail(room.conversationId(), room.participantIds(), room.offerId(),
                room.contractId(), room.status());
    }

    private ConversationSummary summary(Conversation room, String viewer) {
        ChatMessage last = messages.listNewest(room.conversationId(), null, null, 1)
                .stream().findFirst().orElse(null);
        return new ConversationSummary(room.conversationId(), room.offerId(), room.participantIds(),
                room.contractId(), room.status(), last,
                messages.countUnreadFromOthers(room.conversationId(), viewer));
    }

    public record ConversationSummary(String conversationId, String offerId, List<String> participantIds,
            String contractId, String status, ChatMessage lastMessage, long unreadCount) {}

    public record ConversationPage(List<ConversationSummary> data, String nextCursor) {}

    public record ConversationDetail(String conversationId, List<String> participantIds,
            String offerId, String contractId, String status) {}

    private record Position(Instant updatedAt, String conversationId) {}

    private String encode(Conversation room) {
        String raw = room.updatedAt().toEpochMilli() + "|" + room.conversationId();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private Position decode(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        if (cursor.length() > 200) throw new IllegalArgumentException("Invalid cursor.");
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 2) throw new IllegalArgumentException();
            return new Position(Instant.ofEpochMilli(Long.parseLong(parts[0])), uuid(parts[1]));
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("Invalid cursor.");
        }
    }

    private String uuid(String value) {
        if (value == null) throw new IllegalArgumentException("ID must be a UUID.");
        try {
            UUID parsed = UUID.fromString(value);
            if (!parsed.toString().equalsIgnoreCase(value)) throw new IllegalArgumentException();
            return parsed.toString();
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("ID must be a UUID.");
        }
    }

    public static class ConversationNotFoundException extends RuntimeException {
        public ConversationNotFoundException(String id) { super("Conversation not found: " + id); }
    }

    public static class ConversationAccessDeniedException extends RuntimeException {}
}
