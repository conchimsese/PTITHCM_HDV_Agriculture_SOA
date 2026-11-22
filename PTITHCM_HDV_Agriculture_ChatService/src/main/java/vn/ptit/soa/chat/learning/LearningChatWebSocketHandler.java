package vn.ptit.soa.chat.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;
import vn.ptit.soa.chat.conversation.ConversationReadService;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageRepository;
import vn.ptit.soa.chat.message.ChatMessageService;
import vn.ptit.soa.chat.message.ChatRealtimeEvents;

@Component
@Profile("learning & database-learning")
public class LearningChatWebSocketHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(LearningChatWebSocketHandler.class);
    private final ObjectMapper mapper;
    private final ConversationReadService reads;
    private final ChatMessageService messages;
    private final ChatMessageRepository repository;
    private final Map<String, Client> clients = new ConcurrentHashMap<>();

    public LearningChatWebSocketHandler(ObjectMapper mapper, ConversationReadService reads,
            ChatMessageService messages, ChatMessageRepository repository) {
        this.mapper = mapper;
        this.reads = reads;
        this.messages = messages;
        this.repository = repository;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        try {
            String viewerId = UriComponentsBuilder.fromUri(session.getUri()).build()
                    .getQueryParams().getFirst("viewerId");
            String viewer = uuid(viewerId);
            session.setTextMessageSizeLimit(8192);
            clients.put(session.getId(), new Client(viewer,
                    new ConcurrentWebSocketSessionDecorator(session, 10000, 65536)));
        } catch (RuntimeException invalid) {
            session.close(CloseStatus.POLICY_VIOLATION);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage frame) {
        Client client = clients.get(session.getId());
        if (client == null) return;
        try {
            JsonNode request = mapper.readTree(frame.getPayload());
            if (request == null || !request.isObject()
                    || request.has("viewerId") || request.has("senderId")) {
                throw new IllegalArgumentException("Invalid WebSocket frame.");
            }
            String type = required(request, "type");
            String roomId = uuid(required(request, "conversationId"));
            switch (type) {
                case "joinConversation" -> {
                    reads.detail(roomId, client.viewerId);
                    client.conversationId = roomId;
                    send(client, Map.of("type", "joinedConversation", "conversationId", roomId));
                }
                case "sendMessage" -> {
                    requireJoined(client, roomId);
                    String messageType = required(request, "messageType");
                    if ("TEXT".equals(messageType)) {
                        if (request.hasNonNull("attachmentUrl")) throw new IllegalArgumentException("TEXT cannot attach an image.");
                        messages.sendText(roomId, client.viewerId, required(request, "content"));
                    } else if ("IMAGE".equals(messageType)) {
                        if (request.hasNonNull("content")) throw new IllegalArgumentException("IMAGE content must be empty.");
                        messages.sendImage(roomId, client.viewerId, required(request, "attachmentUrl"));
                    } else {
                        throw new IllegalArgumentException("Only TEXT and IMAGE messages can be sent by a client.");
                    }
                }
                case "readMessage" -> {
                    requireJoined(client, roomId);
                    messages.markRead(roomId, client.viewerId, required(request, "messageId"));
                }
                default -> throw new IllegalArgumentException("Unknown WebSocket action.");
            }
        } catch (Exception invalid) {
            String message = invalid instanceof IllegalArgumentException
                    ? invalid.getMessage() : "Invalid WebSocket request.";
            send(client, Map.of("type", "error", "message", message));
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void messageSent(ChatRealtimeEvents.MessageSent event) {
        try {
            ChatMessage message = event.message();
            broadcast(message.conversationId(), Map.of("type", "messageSent", "message", message));
            long unread = repository.countUnreadFromOthers(message.conversationId(), event.recipientId());
            toViewer(event.recipientId(), Map.of(
                    "type", "unreadCountChanged", "conversationId", message.conversationId(),
                    "unreadCount", unread));
        } catch (RuntimeException failure) {
            // Mongo has already committed. The client can recover from the list/history endpoints.
            log.warn("Could not deliver a Chat realtime update after commit. Cause: {}",
                    failure.getClass().getSimpleName());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void messageRead(ChatRealtimeEvents.MessageRead event) {
        try {
            var result = event.result();
            broadcast(event.conversationId(), Map.of("type", "messageRead",
                    "messageId", result.messageId(), "isRead", result.isRead(),
                    "readAt", result.readAt(), "unreadCount", result.unreadCount()));
            toViewer(event.readerId(), Map.of("type", "unreadCountChanged",
                    "conversationId", event.conversationId(), "unreadCount", result.unreadCount()));
        } catch (RuntimeException failure) {
            log.warn("Could not deliver a Chat read update after commit. Cause: {}",
                    failure.getClass().getSimpleName());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void contractUpdated(ChatRealtimeEvents.ContractUpdated event) {
        try {
            broadcast(event.conversationId(), Map.of("type", "contractUpdated",
                    "conversationId", event.conversationId(), "contractId", event.contractId(),
                    "status", event.status(),
                    "stateVersion", event.stateVersion(),
                    "occurredAt", event.occurredAt() != null ? event.occurredAt().toString() : ""));
        } catch (RuntimeException failure) {
            log.warn("Could not deliver a Chat contract update after commit. Cause: {}",
                    failure.getClass().getSimpleName());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        clients.remove(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        clients.remove(session.getId());
        if (session.isOpen()) session.close(CloseStatus.SERVER_ERROR);
    }

    private void requireJoined(Client client, String roomId) {
        if (!roomId.equals(client.conversationId)) throw new IllegalArgumentException("Join this conversation first.");
    }

    private void broadcast(String roomId, Object payload) {
        clients.values().stream().filter(client -> roomId.equals(client.conversationId))
                .forEach(client -> send(client, payload));
    }

    private void toViewer(String viewerId, Object payload) {
        clients.values().stream().filter(client -> viewerId.equals(client.viewerId))
                .forEach(client -> send(client, payload));
    }

    private void send(Client client, Object payload) {
        try {
            if (client.session.isOpen()) client.session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
        } catch (IOException failure) {
            clients.remove(client.session.getId());
            try { client.session.close(CloseStatus.SERVER_ERROR); } catch (IOException ignored) { }
        }
    }

    private String required(JsonNode request, String field) {
        JsonNode value = request.path(field);
        if (!value.isTextual() || value.asText().isBlank()) throw new IllegalArgumentException("Missing " + field + ".");
        return value.asText();
    }

    private String uuid(String value) {
        if (value == null) throw new IllegalArgumentException("viewerId must be a UUID.");
        UUID parsed = UUID.fromString(value);
        if (!parsed.toString().equalsIgnoreCase(value)) throw new IllegalArgumentException("Invalid UUID.");
        return parsed.toString();
    }

    private static class Client {
        final String viewerId;
        final ConcurrentWebSocketSessionDecorator session;
        volatile String conversationId;

        Client(String viewerId, ConcurrentWebSocketSessionDecorator session) {
            this.viewerId = viewerId;
            this.session = session;
        }
    }
}
