package vn.ptit.soa.chat.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import vn.ptit.soa.chat.conversation.ConversationReadService;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageRepository;
import vn.ptit.soa.chat.message.ChatMessageService;
import vn.ptit.soa.chat.message.ChatRealtimeEvents;

class SecureChatWebSocketHandlerTest {
    private static final String ROOM = "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private final JwtDecoder decoder = mock(JwtDecoder.class);
    private final UserAccessStateClient access = mock(UserAccessStateClient.class);
    private final ConversationReadService reads = mock(ConversationReadService.class);
    private final ChatMessageService messages = mock(ChatMessageService.class);
    private final ChatMessageRepository repository = mock(ChatMessageRepository.class);
    private final SecureChatWebSocketHandler handler = new SecureChatWebSocketHandler(
            new ObjectMapper(), decoder, access, reads, messages, repository);

    @Test
    void connectIsRequiredAndFramesCannotChooseAnotherSender() throws Exception {
        WebSocketSession unauthenticated = session("unauthenticated");
        handler.afterConnectionEstablished(unauthenticated);
        frame(unauthenticated, """
                {"type":"sendMessage","conversationId":"%s","messageType":"TEXT","content":"fake"}
                """.formatted(ROOM));
        verify(unauthenticated).close(CloseStatus.POLICY_VIOLATION);

        Jwt farmer = jwt(FARMER, Instant.now().plusSeconds(900));
        when(decoder.decode("good-token")).thenReturn(farmer);
        when(reads.detail(ROOM, FARMER)).thenReturn(new ConversationReadService.ConversationDetail(
                ROOM, List.of(FARMER, TRADER), null, null, "ACTIVE"));
        WebSocketSession connected = session("farmer");
        handler.afterConnectionEstablished(connected);
        frame(connected, "{" + "\"type\":\"CONNECT\",\"authorization\":\"Bearer good-token\"}");
        frame(connected, """
                {"type":"joinConversation","conversationId":"%s"}
                """.formatted(ROOM));
        frame(connected, """
                {"type":"sendMessage","conversationId":"%s","senderId":"%s",
                 "messageType":"TEXT","content":"forged"}
                """.formatted(ROOM, TRADER));
        verify(messages, never()).sendText(ROOM, TRADER, "forged");
        frame(connected, """
                {"type":"sendMessage","conversationId":"%s","messageType":"TEXT","content":"hello"}
                """.formatted(ROOM));
        verify(messages).sendText(ROOM, FARMER, "hello");
        frame(connected, """
                {"type":"sendMessage","conversationId":"%s","messageType":"IMAGE",
                 "attachmentUrl":"/api/v1/conversations/%s/media/9cd756ec-53a1-461c-9960-6c648b157853"}
                """.formatted(ROOM, ROOM));
        verify(messages).sendImageSecure(ROOM, FARMER,
                "/api/v1/conversations/" + ROOM + "/media/9cd756ec-53a1-461c-9960-6c648b157853");
        frame(connected, """
                {"type":"readMessage","conversationId":"%s","messageId":"a9d2c9e8-c777-4683-8238-1fda1bb4c653"}
                """.formatted(ROOM));
        verify(messages).markRead(ROOM, FARMER, "a9d2c9e8-c777-4683-8238-1fda1bb4c653");
        handler.messageRead(new ChatRealtimeEvents.MessageRead(ROOM, FARMER,
                new ChatMessageService.ReadResult("a9d2c9e8-c777-4683-8238-1fda1bb4c653", true, null, 0)));
        ArgumentCaptor<WebSocketMessage<?>> frames = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(connected, org.mockito.Mockito.atLeastOnce()).sendMessage(frames.capture());
        assertTrue(frames.getAllValues().stream().map(value -> ((TextMessage) value).getPayload())
                .anyMatch(payload -> payload.contains("\"readAt\":null")));
    }

    @Test
    void accountLockPreventsPrivatePushAndClosesSocket() throws Exception {
        Jwt trader = jwt(TRADER, Instant.now().plusSeconds(900));
        when(decoder.decode("trader-token")).thenReturn(trader);
        when(reads.detail(ROOM, TRADER)).thenReturn(new ConversationReadService.ConversationDetail(
                ROOM, List.of(FARMER, TRADER), null, null, "ACTIVE"));
        WebSocketSession session = session("trader");
        handler.afterConnectionEstablished(session);
        frame(session, "{\"type\":\"CONNECT\",\"authorization\":\"Bearer trader-token\"}");
        frame(session, "{\"type\":\"joinConversation\",\"conversationId\":\"" + ROOM + "\"}");
        doThrow(new UserAccessStateClient.AccountForbiddenException()).when(access)
                .requireActiveParticipant(trader);
        ChatMessage privateMessage = new ChatMessage("a9d2c9e8-c777-4683-8238-1fda1bb4c653", ROOM,
                FARMER, "TEXT", "private message", null, null, false, Instant.now(), null);
        handler.messageSent(new ChatRealtimeEvents.MessageSent(privateMessage, TRADER));
        verify(session).close(CloseStatus.POLICY_VIOLATION);
        ArgumentCaptor<WebSocketMessage<?>> sent = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(session, org.mockito.Mockito.atLeastOnce()).sendMessage(sent.capture());
        assertFalse(sent.getAllValues().stream().map(value -> ((TextMessage) value).getPayload())
                .anyMatch(payload -> payload.contains("private message")));
    }

    @Test
    void expiredTokenClosesExistingConnection() throws Exception {
        Jwt shortLived = jwt(FARMER, Instant.now().plusMillis(500));
        when(decoder.decode("short-token")).thenReturn(shortLived);
        WebSocketSession session = session("short");
        handler.afterConnectionEstablished(session);
        frame(session, "{\"type\":\"CONNECT\",\"authorization\":\"Bearer short-token\"}");
        Thread.sleep(650);
        handler.closeExpiredConnections();
        verify(session).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    void badgeCanReachSidebarButContentRequiresJoinedRoom() throws Exception {
        Jwt trader = jwt(TRADER, Instant.now().plusSeconds(900));
        when(decoder.decode("trader-token")).thenReturn(trader);
        when(reads.detail(ROOM, TRADER)).thenReturn(new ConversationReadService.ConversationDetail(
                ROOM, List.of(FARMER, TRADER), null, null, "ACTIVE"));
        when(repository.countUnreadFromOthers(ROOM, TRADER)).thenReturn(1L);
        WebSocketSession sidebar = session("sidebar");
        handler.afterConnectionEstablished(sidebar);
        frame(sidebar, "{\"type\":\"CONNECT\",\"authorization\":\"Bearer trader-token\"}");
        ChatMessage privateMessage = new ChatMessage("a9d2c9e8-c777-4683-8238-1fda1bb4c653", ROOM,
                FARMER, "TEXT", "private message", null, null, false, Instant.now(), null);
        handler.messageSent(new ChatRealtimeEvents.MessageSent(privateMessage, TRADER));
        ArgumentCaptor<WebSocketMessage<?>> sent = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(sidebar, org.mockito.Mockito.atLeastOnce()).sendMessage(sent.capture());
        List<String> payloads = sent.getAllValues().stream().map(value -> ((TextMessage) value).getPayload()).toList();
        assertTrue(payloads.stream().anyMatch(payload -> payload.contains("unreadCountChanged")));
        assertFalse(payloads.stream().anyMatch(payload -> payload.contains("private message")));
    }

    @Test
    void outsiderCannotJoinAndUnavailableUserClosesConnect() throws Exception {
        String outsiderId = "f3a1b6aa-3456-4bea-a121-06d596aadad1";
        Jwt outsider = jwt(outsiderId, Instant.now().plusSeconds(900));
        when(decoder.decode("outsider-token")).thenReturn(outsider);
        when(reads.detail(ROOM, outsiderId)).thenThrow(new ConversationReadService.ConversationAccessDeniedException());
        WebSocketSession outsiderSocket = session("outsider");
        handler.afterConnectionEstablished(outsiderSocket);
        frame(outsiderSocket, "{\"type\":\"CONNECT\",\"authorization\":\"Bearer outsider-token\"}");
        frame(outsiderSocket, "{\"type\":\"joinConversation\",\"conversationId\":\"" + ROOM + "\"}");
        verify(messages, never()).sendText(any(), any(), any());
        ArgumentCaptor<WebSocketMessage<?>> captured = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(outsiderSocket, org.mockito.Mockito.atLeastOnce()).sendMessage(captured.capture());
        assertTrue(captured.getAllValues().stream().map(value -> ((TextMessage) value).getPayload())
                .anyMatch(payload -> payload.contains("\"type\":\"error\"")));

        Jwt farmer = jwt(FARMER, Instant.now().plusSeconds(900));
        when(decoder.decode("farmer-token")).thenReturn(farmer);
        doThrow(new UserAccessStateClient.AccessStateUnavailableException()).when(access)
                .requireActiveParticipant(farmer);
        WebSocketSession unavailable = session("unavailable");
        handler.afterConnectionEstablished(unavailable);
        frame(unavailable, "{\"type\":\"CONNECT\",\"authorization\":\"Bearer farmer-token\"}");
        verify(unavailable).close(new CloseStatus(1013, "Access state unavailable"));
    }

    @Test
    void lockedAccountCannotSendOnExistingConnection() throws Exception {
        Jwt farmer = jwt(FARMER, Instant.now().plusSeconds(900));
        when(decoder.decode("farmer-token")).thenReturn(farmer);
        when(reads.detail(ROOM, FARMER)).thenReturn(new ConversationReadService.ConversationDetail(
                ROOM, List.of(FARMER, TRADER), null, null, "ACTIVE"));
        WebSocketSession socket = session("sender");
        handler.afterConnectionEstablished(socket);
        frame(socket, "{\"type\":\"CONNECT\",\"authorization\":\"Bearer farmer-token\"}");
        frame(socket, "{\"type\":\"joinConversation\",\"conversationId\":\"" + ROOM + "\"}");
        doThrow(new UserAccessStateClient.AccountForbiddenException()).when(access)
                .requireActiveParticipant(farmer);
        frame(socket, "{\"type\":\"sendMessage\",\"conversationId\":\"" + ROOM
                + "\",\"messageType\":\"TEXT\",\"content\":\"blocked\"}");
        verify(socket).close(CloseStatus.POLICY_VIOLATION);
        verify(messages, never()).sendText(ROOM, FARMER, "blocked");
    }

    private void frame(WebSocketSession session, String payload) throws Exception {
        handler.handleMessage(session, new TextMessage(payload));
    }

    private WebSocketSession session(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        return session;
    }

    private Jwt jwt(String subject, Instant expires) {
        return Jwt.withTokenValue("test-token").header("alg", "RS256")
                .claim("sub", subject).claim("role", "FARMER")
                .issuedAt(Instant.now()).expiresAt(expires).build();
    }
}
