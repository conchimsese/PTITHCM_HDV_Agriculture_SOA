package vn.ptit.soa.chat.learning;

import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import vn.ptit.soa.chat.conversation.ConversationReadService;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageRepository;
import vn.ptit.soa.chat.message.ChatMessageService;
import vn.ptit.soa.chat.message.ChatRealtimeEvents;

class LearningChatWebSocketHandlerTest {
    private static final String ROOM = "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0";
    private static final String VIEWER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String OTHER = "e14961fb-7e5a-4613-8837-8cadf6a887de";

    @Test
    void senderIsBoundToConnectionAndCannotBeOverriddenByFrame() throws Exception {
        ConversationReadService reads = mock(ConversationReadService.class);
        ChatMessageService messages = mock(ChatMessageService.class);
        LearningChatWebSocketHandler handler = new LearningChatWebSocketHandler(
                new ObjectMapper(), reads, messages, mock(ChatMessageRepository.class));
        WebSocketSession session = session();
        when(reads.detail(ROOM, VIEWER)).thenReturn(new ConversationReadService.ConversationDetail(
                ROOM, List.of(VIEWER, OTHER), "202fe3fd-626a-41c8-80fd-70af82c1f256", null, "ACTIVE"));

        handler.afterConnectionEstablished(session);
        handler.handleMessage(session, new TextMessage("""
                {"type":"joinConversation","conversationId":"%s"}
                """.formatted(ROOM)));
        handler.handleMessage(session, new TextMessage("""
                {"type":"sendMessage","conversationId":"%s","senderId":"%s",
                 "messageType":"TEXT","content":"forged"}
                """.formatted(ROOM, OTHER)));
        verify(messages, never()).sendText(any(), any(), any());

        handler.handleMessage(session, new TextMessage("""
                {"type":"sendMessage","conversationId":"%s",
                 "messageType":"TEXT","content":"hello"}
                """.formatted(ROOM)));
        verify(messages).sendText(ROOM, VIEWER, "hello");
    }

    @Test
    void cannotSendBeforeJoiningRoom() throws Exception {
        ChatMessageService messages = mock(ChatMessageService.class);
        LearningChatWebSocketHandler handler = new LearningChatWebSocketHandler(new ObjectMapper(),
                mock(ConversationReadService.class), messages, mock(ChatMessageRepository.class));
        WebSocketSession session = session();
        handler.afterConnectionEstablished(session);
        handler.handleMessage(session, new TextMessage("""
                {"type":"sendMessage","conversationId":"%s","messageType":"TEXT","content":"hello"}
                """.formatted(ROOM)));
        verifyNoInteractions(messages);
    }

    @Test
    void sidebarReceivesBadgeWithoutPrivateMessageContent() throws Exception {
        ChatMessageRepository repository = mock(ChatMessageRepository.class);
        LearningChatWebSocketHandler handler = new LearningChatWebSocketHandler(new ObjectMapper(),
                mock(ConversationReadService.class), mock(ChatMessageService.class), repository);
        WebSocketSession sidebar = session(OTHER, "sidebar-session");
        handler.afterConnectionEstablished(sidebar);
        when(repository.countUnreadFromOthers(ROOM, OTHER)).thenReturn(1L);
        ChatMessage message = new ChatMessage("22222222-2222-4222-8222-222222222222", ROOM, VIEWER,
                "TEXT", "private content", null, null, false, Instant.now(), null);

        handler.messageSent(new ChatRealtimeEvents.MessageSent(message, OTHER));

        ArgumentCaptor<WebSocketMessage<?>> sent = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(sidebar).sendMessage(sent.capture());
        String payload = ((TextMessage) sent.getValue()).getPayload();
        org.junit.jupiter.api.Assertions.assertTrue(payload.contains("unreadCountChanged"));
        org.junit.jupiter.api.Assertions.assertFalse(payload.contains("private content"));
    }

    private WebSocketSession session() {
        return session(VIEWER, "test-session");
    }

    private WebSocketSession session(String viewerId, String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.getUri()).thenReturn(URI.create("ws://localhost:8084/learning/ws/chat?viewerId=" + viewerId));
        when(session.isOpen()).thenReturn(true);
        return session;
    }
}
