package vn.ptit.soa.chat.message;

import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ptit.soa.chat.conversation.Conversation;
import vn.ptit.soa.chat.conversation.ConversationRepository;
import vn.ptit.soa.chat.media.ChatMediaService;
import vn.ptit.soa.chat.media.MediaAssetRepository;
import java.util.Map;

@Service
@Profile("database-learning")
public class ChatMessageService {
    private final ConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final MediaAssetRepository media;
    private final ChatOutboxRepository outbox;
    private final ApplicationEventPublisher events;

    public ChatMessageService(ConversationRepository conversations, ChatMessageRepository messages,
            MediaAssetRepository media, ChatOutboxRepository outbox, ApplicationEventPublisher events) {
        this.conversations = conversations;
        this.messages = messages;
        this.media = media;
        this.outbox = outbox;
        this.events = events;
    }

    // Callers must supply an identity already verified by their HTTP/WebSocket boundary.
    @Transactional
    public ChatMessage sendText(String conversationId, String senderId, String content) {
        String roomId = uuid(conversationId);
        String sender = uuid(senderId);
        Conversation room = conversations.findById(roomId)
                .orElseThrow(MissingConversationException::new);
        if (!room.participantIds().contains(sender)) {
            throw new NotParticipantException();
        }
        if (!"ACTIVE".equals(room.status())) {
            throw new ClosedConversationException();
        }
        if (content == null || content.isBlank() || content.codePointCount(0, content.length()) > 2000) {
            throw new IllegalArgumentException("TEXT content must contain 1 to 2000 characters.");
        }
        Instant now = Instant.now();
        ChatMessage message = new ChatMessage(UUID.randomUUID().toString(), roomId, sender,
                "TEXT", content, null, null, false, now, null);
        ChatMessage saved = messages.insert(message);
        conversations.touch(roomId, now);
        String recipient = writeEvent(room, saved);
        events.publishEvent(new ChatRealtimeEvents.MessageSent(saved, recipient));
        return saved;
    }

    @Transactional
    public ChatMessage sendImage(String conversationId, String senderId, String attachmentUrl) {
        return sendImageInternal(conversationId, senderId, attachmentUrl, false);
    }

    @Transactional
    public ChatMessage sendImageSecure(String conversationId, String senderId, String attachmentUrl) {
        return sendImageInternal(conversationId, senderId, attachmentUrl, true);
    }

    private ChatMessage sendImageInternal(String conversationId, String senderId,
            String attachmentUrl, boolean secureUrl) {
        String roomId = uuid(conversationId);
        String sender = uuid(senderId);
        Conversation room = conversations.findById(roomId)
                .orElseThrow(MissingConversationException::new);
        if (!room.participantIds().contains(sender))
            throw new NotParticipantException();
        if (!"ACTIVE".equals(room.status())) throw new ClosedConversationException();
        String prefix = (secureUrl ? "/api/v1" : "/learning") + "/conversations/" + roomId + "/media/";
        if (attachmentUrl == null || !attachmentUrl.startsWith(prefix))
            throw new IllegalArgumentException("IMAGE requires a Chat upload URL for this conversation.");
        String mediaId = uuid(attachmentUrl.substring(prefix.length()));
        String expected = secureUrl ? ChatMediaService.apiUrl(roomId, mediaId) : ChatMediaService.url(roomId, mediaId);
        if (!attachmentUrl.equals(expected))
            throw new IllegalArgumentException("Invalid Chat upload URL.");
        Instant now = Instant.now();
        if (!media.attach(mediaId, roomId, sender, now))
            throw new IllegalArgumentException("Image is missing, belongs to someone else, or was already sent.");
        ChatMessage message = new ChatMessage(UUID.randomUUID().toString(), roomId, sender,
                "IMAGE", null, attachmentUrl, null, false, now, null);
        ChatMessage saved = messages.insert(message);
        conversations.touch(roomId, now);
        String recipient = writeEvent(room, saved);
        events.publishEvent(new ChatRealtimeEvents.MessageSent(saved, recipient));
        return saved;
    }

    private String writeEvent(Conversation room, ChatMessage message) {
        List<String> recipients = room.participantIds().stream()
                .filter(id -> !id.equals(message.senderId())).toList();
        if (recipients.isEmpty()) throw new IllegalStateException("Conversation has no message recipient.");
        outbox.insert(new ChatOutboxEvent(UUID.randomUUID().toString(), "MESSAGE_CREATED", 1,
                "chat-service", message.createdAt(), message.senderId(), recipients,
                "CONVERSATION", message.conversationId(), "soa.chat.message.v1",
                message.conversationId(), Map.of("messageId", message.messageId(),
                    "conversationId", message.conversationId(), "senderId", message.senderId(),
                    "recipientId", recipients.get(0)), null, null, null, 0));
        return recipients.get(0);
    }

    public ReadResult markRead(String conversationId, String readerId, String messageId) {
        String roomId = uuid(conversationId);
        String reader = uuid(readerId);
        String message = uuid(messageId);
        Conversation room = conversations.findById(roomId)
                .orElseThrow(MissingConversationException::new);
        if (!room.participantIds().contains(reader)) {
            throw new NotParticipantException();
        }
        if (!"ACTIVE".equals(room.status())) {
            throw new ClosedConversationException();
        }
        ChatMessage target = messages.findById(message)
                .filter(found -> roomId.equals(found.conversationId()))
                .orElseThrow(MissingMessageException::new);
        if (reader.equals(target.senderId())) {
            throw new NotReadableMessageException();
        }
        boolean changed = false;
        if (!target.isRead()) {
            var updated = messages.markReadIfUnread(message, roomId, Instant.now());
            changed = updated.isPresent();
            target = updated.orElseGet(() -> messages.findById(message).orElseThrow());
        }
        ReadResult result = new ReadResult(target.messageId(), target.isRead(), target.readAt(),
                messages.countUnreadFromOthers(roomId, reader));
        if (changed) events.publishEvent(new ChatRealtimeEvents.MessageRead(roomId, reader, result));
        return result;
    }

    public record ReadResult(String messageId, boolean isRead, Instant readAt, long unreadCount) {}

    public MessagePage history(String conversationId, String viewerId, int limit, String cursor) {
        String roomId = uuid(conversationId);
        String viewer = uuid(viewerId);
        Conversation room = conversations.findById(roomId)
                .orElseThrow(MissingConversationException::new);
        if (!room.participantIds().contains(viewer)) {
            throw new NotParticipantException();
        }
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Limit must be between 1 and 100.");
        }
        MessageCursor before = decodeCursor(cursor);
        List<ChatMessage> found = messages.listNewest(roomId,
                before == null ? null : before.createdAt(),
                before == null ? null : before.messageId(), limit + 1);
        boolean hasMore = found.size() > limit;
        List<ChatMessage> page = hasMore ? found.subList(0, limit) : found;
        String nextCursor = hasMore ? encodeCursor(page.get(page.size() - 1)) : null;
        return new MessagePage(page, nextCursor);
    }

    public record MessagePage(List<ChatMessage> data, String nextCursor) {}

    private record MessageCursor(Instant createdAt, String messageId) {}

    private String encodeCursor(ChatMessage last) {
        String value = last.createdAt().toEpochMilli() + "|" + last.messageId();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private MessageCursor decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        if (cursor.length() > 200) throw new IllegalArgumentException("Invalid cursor.");
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|", -1);
            if (parts.length != 2) throw new IllegalArgumentException();
            Instant time = Instant.ofEpochMilli(Long.parseLong(parts[0]));
            return new MessageCursor(time, uuid(parts[1]));
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

    public static class MissingConversationException extends IllegalArgumentException {
        public MissingConversationException() { super("Conversation does not exist."); }
    }

    public static class NotParticipantException extends IllegalArgumentException {
        public NotParticipantException() { super("Not a conversation participant."); }
    }

    public static class ClosedConversationException extends IllegalArgumentException {
        public ClosedConversationException() { super("Conversation is closed."); }
    }

    public static class MissingMessageException extends IllegalArgumentException {
        public MissingMessageException() { super("Message does not exist in this conversation."); }
    }

    public static class NotReadableMessageException extends IllegalArgumentException {
        public NotReadableMessageException() { super("A sender cannot mark their own message as read."); }
    }
}
