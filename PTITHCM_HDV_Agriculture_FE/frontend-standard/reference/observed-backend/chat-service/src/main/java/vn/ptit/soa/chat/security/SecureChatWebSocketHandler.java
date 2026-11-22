package vn.ptit.soa.chat.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import vn.ptit.soa.chat.conversation.ConversationReadService;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageRepository;
import vn.ptit.soa.chat.message.ChatMessageService;
import vn.ptit.soa.chat.message.ChatRealtimeEvents;

@Component
@Profile("secure & database-learning")
public class SecureChatWebSocketHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(SecureChatWebSocketHandler.class);
    private static final CloseStatus AUTH_CLOSED = CloseStatus.POLICY_VIOLATION;
    private static final CloseStatus USER_UNAVAILABLE = new CloseStatus(1013, "Access state unavailable");
    private final ObjectMapper json;
    private final JwtDecoder decoder;
    private final UserAccessStateClient access;
    private final ConversationReadService reads;
    private final ChatMessageService messages;
    private final ChatMessageRepository repository;
    private final Map<String, Client> clients = new ConcurrentHashMap<>();

    public SecureChatWebSocketHandler(ObjectMapper json, JwtDecoder decoder, UserAccessStateClient access,
            ConversationReadService reads, ChatMessageService messages, ChatMessageRepository repository) {
        this.json = json;
        this.decoder = decoder;
        this.access = access;
        this.reads = reads;
        this.messages = messages;
        this.repository = repository;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        session.setTextMessageSizeLimit(8192);
        clients.put(session.getId(), new Client(new ConcurrentWebSocketSessionDecorator(session, 10000, 65536)));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage frame) {
        Client client = clients.get(session.getId());
        if (client == null) return;
        try {
            JsonNode request = json.readTree(frame.getPayload());
            if (request == null || !request.isObject() || request.has("viewerId")
                    || request.has("senderId") || request.has("readerId") || request.has("token")) {
                throw new IllegalArgumentException("Invalid WebSocket frame.");
            }
            String type = required(request, "type");
            if (client.jwt == null) {
                if (!"CONNECT".equals(type) || Instant.now().isAfter(client.connectDeadline)) {
                    close(client, AUTH_CLOSED);
                    return;
                }
                connect(client, request);
                return;
            }
            if (!live(client)) return;
            if ("CONNECT".equals(type) || request.has("authorization")) {
                throw new IllegalArgumentException("Reconnect with a new token instead of sending CONNECT again.");
            }
            String roomId = uuid(required(request, "conversationId"));
            switch (type) {
                case "joinConversation" -> {
                    reads.detail(roomId, client.jwt.getSubject());
                    client.conversationId = roomId;
                    send(client, Map.of("type", "joinedConversation", "conversationId", roomId));
                }
                case "sendMessage" -> {
                    requireJoined(client, roomId);
                    reads.detail(roomId, client.jwt.getSubject());
                    String messageType = required(request, "messageType");
                    if ("TEXT".equals(messageType)) {
                        if (request.hasNonNull("attachmentUrl"))
                            throw new IllegalArgumentException("TEXT cannot attach an image.");
                        messages.sendText(roomId, client.jwt.getSubject(), required(request, "content"));
                    } else if ("IMAGE".equals(messageType)) {
                        if (request.hasNonNull("content"))
                            throw new IllegalArgumentException("IMAGE content must be empty.");
                        messages.sendImageSecure(roomId, client.jwt.getSubject(), required(request, "attachmentUrl"));
                    } else {
                        throw new IllegalArgumentException("Only TEXT and IMAGE messages can be sent by a client.");
                    }
                }
                case "readMessage" -> {
                    requireJoined(client, roomId);
                    reads.detail(roomId, client.jwt.getSubject());
                    messages.markRead(roomId, client.jwt.getSubject(), required(request, "messageId"));
                }
                default -> throw new IllegalArgumentException("Unknown WebSocket action.");
            }
        } catch (Exception invalid) {
            // Never log the frame: CONNECT contains a Bearer token and messages contain private text.
            String message = invalid instanceof IllegalArgumentException
                    ? invalid.getMessage() : "Invalid WebSocket request.";
            send(client, Map.of("type", "error", "message", message));
        }
    }

    private void connect(Client client, JsonNode request) {
        String authorization = required(request, "authorization");
        if (!authorization.startsWith("Bearer ") || authorization.length() <= 7) {
            close(client, AUTH_CLOSED);
            return;
        }
        try {
            Jwt verified = decoder.decode(authorization.substring(7));
            if (!unexpired(verified)) {
                close(client, AUTH_CLOSED);
                return;
            }
            access.requireActiveParticipant(verified);
            client.jwt = verified;
            send(client, Map.of("type", "connected", "accountId", verified.getSubject()));
        } catch (UserAccessStateClient.AccessStateUnavailableException unavailable) {
            close(client, USER_UNAVAILABLE);
        } catch (RuntimeException denied) {
            close(client, AUTH_CLOSED);
        }
    }

    private boolean live(Client client) {
        Jwt verified = client.jwt;
        if (verified == null || !unexpired(verified)) {
            close(client, AUTH_CLOSED);
            return false;
        }
        try {
            access.requireActiveParticipant(verified);
            return true;
        } catch (UserAccessStateClient.AccessStateUnavailableException unavailable) {
            close(client, USER_UNAVAILABLE);
        } catch (UserAccessStateClient.AccountForbiddenException denied) {
            close(client, AUTH_CLOSED);
        }
        return false;
    }

    private boolean unexpired(Jwt jwt) {
        return jwt.getExpiresAt() != null && Instant.now().isBefore(jwt.getExpiresAt());
    }

    private void requireJoined(Client client, String roomId) {
        if (!roomId.equals(client.conversationId)) throw new IllegalArgumentException("Join this conversation first.");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void messageSent(ChatRealtimeEvents.MessageSent event) {
        try {
            ChatMessage message = event.message();
            broadcast(message.conversationId(), Map.of("type", "messageSent", "message", message));
            long unread = repository.countUnreadFromOthers(message.conversationId(), event.recipientId());
            toViewer(event.recipientId(), message.conversationId(), Map.of(
                    "type", "unreadCountChanged", "conversationId", message.conversationId(),
                    "unreadCount", unread));
        } catch (RuntimeException failure) {
            log.warn("Could not deliver a Chat realtime update after commit. Cause: {}",
                    failure.getClass().getSimpleName());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void messageRead(ChatRealtimeEvents.MessageRead event) {
        try {
            var result = event.result();
            Map<String, Object> update = new LinkedHashMap<>();
            update.put("type", "messageRead");
            update.put("messageId", result.messageId());
            update.put("isRead", result.isRead());
            update.put("readAt", result.readAt());
            update.put("unreadCount", result.unreadCount());
            broadcast(event.conversationId(), update);
            toViewer(event.readerId(), event.conversationId(), Map.of(
                    "type", "unreadCountChanged", "conversationId", event.conversationId(),
                    "unreadCount", result.unreadCount()));
        } catch (RuntimeException failure) {
            log.warn("Could not deliver a Chat read update after commit. Cause: {}",
                    failure.getClass().getSimpleName());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void contractUpdated(ChatRealtimeEvents.ContractUpdated event) {
        try {
            Map<String, Object> update = new LinkedHashMap<>();
            update.put("type", "contractUpdated");
            update.put("conversationId", event.conversationId());
            update.put("contractId", event.contractId());
            update.put("status", event.status());
            update.put("stateVersion", event.stateVersion());
            update.put("occurredAt", event.occurredAt() != null ? event.occurredAt().toString() : null);
            broadcast(event.conversationId(), update);
        } catch (RuntimeException failure) {
            log.warn("Could not deliver a Chat contract update after commit. Cause: {}",
                    failure.getClass().getSimpleName());
        }
    }

    private void broadcast(String roomId, Object payload) {
        for (Client client : clients.values()) {
            if (roomId.equals(client.conversationId)) deliver(client, roomId, payload);
        }
    }

    private void toViewer(String viewerId, String roomId, Object payload) {
        for (Client client : clients.values()) {
            if (client.jwt != null && viewerId.equals(client.jwt.getSubject())) deliver(client, roomId, payload);
        }
    }

    private void deliver(Client client, String roomId, Object payload) {
        if (!live(client)) return;
        try {
            reads.detail(roomId, client.jwt.getSubject());
            send(client, payload);
        } catch (RuntimeException forbidden) {
            close(client, AUTH_CLOSED);
        }
    }

    @Scheduled(fixedDelay = 5000, initialDelay = 5000)
    public void closeExpiredConnections() {
        for (Client client : clients.values()) {
            if (client.jwt == null) {
                if (Instant.now().isAfter(client.connectDeadline)) close(client, AUTH_CLOSED);
            } else if (!unexpired(client.jwt)) {
                close(client, AUTH_CLOSED);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        clients.remove(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable error) {
        Client client = clients.get(session.getId());
        if (client != null) close(client, CloseStatus.SERVER_ERROR);
    }

    private void send(Client client, Object payload) {
        try {
            if (client.session.isOpen()) client.session.sendMessage(new TextMessage(json.writeValueAsString(payload)));
        } catch (Exception failed) {
            close(client, CloseStatus.SERVER_ERROR);
        }
    }

    private void close(Client client, CloseStatus status) {
        clients.remove(client.session.getId());
        try { if (client.session.isOpen()) client.session.close(status); }
        catch (IOException ignored) { }
    }

    private String required(JsonNode request, String field) {
        JsonNode value = request.path(field);
        if (!value.isTextual() || value.asText().isBlank())
            throw new IllegalArgumentException("Missing " + field + ".");
        return value.asText();
    }

    private String uuid(String value) {
        try {
            UUID parsed = UUID.fromString(value);
            if (!parsed.toString().equalsIgnoreCase(value)) throw new IllegalArgumentException();
            return parsed.toString();
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("conversationId must be a UUID.");
        }
    }

    private static final class Client {
        final ConcurrentWebSocketSessionDecorator session;
        final Instant connectDeadline = Instant.now().plusSeconds(5);
        volatile Jwt jwt;
        volatile String conversationId;

        Client(ConcurrentWebSocketSessionDecorator session) { this.session = session; }
    }
}
