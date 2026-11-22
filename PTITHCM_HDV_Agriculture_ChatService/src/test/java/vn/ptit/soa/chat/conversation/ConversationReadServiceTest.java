package vn.ptit.soa.chat.conversation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageRepository;

class ConversationReadServiceTest {
    private static final String VIEWER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String OTHER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final Instant TIME = Instant.parse("2026-10-19T00:00:00Z");

    @Test
    void pageUsesSortPairAndCountsOnlyUnreadFromOtherParticipant() {
        ConversationRepository rooms = mock(ConversationRepository.class);
        ChatMessageRepository messages = mock(ChatMessageRepository.class);
        Conversation first = room("ffffffff-ffff-4fff-8fff-ffffffffffff", List.of(VIEWER, OTHER));
        Conversation second = room("11111111-1111-4111-8111-111111111111", List.of(VIEWER, OTHER));
        when(rooms.listForParticipant(VIEWER, null, null, 2)).thenReturn(List.of(first, second));
        when(messages.listNewest(first.conversationId(), null, null, 1)).thenReturn(List.of(
                new ChatMessage("22222222-2222-4222-8222-222222222222", first.conversationId(),
                        OTHER, "TEXT", "Hello", null, null, false, TIME, null)));
        when(messages.countUnreadFromOthers(first.conversationId(), VIEWER)).thenReturn(2L);
        ConversationReadService service = new ConversationReadService(rooms, messages);

        ConversationReadService.ConversationPage page = service.list(VIEWER, 1, null);
        assertEquals(1, page.data().size());
        assertEquals("Hello", page.data().get(0).lastMessage().content());
        assertEquals(2, page.data().get(0).unreadCount());
        assertNotNull(page.nextCursor());
        service.list(VIEWER, 1, page.nextCursor());
        verify(rooms).listForParticipant(VIEWER, TIME, first.conversationId(), 2);
    }

    @Test
    void detailDistinguishesMissingRoomAndNonParticipant() {
        ConversationRepository rooms = mock(ConversationRepository.class);
        ChatMessageRepository messages = mock(ChatMessageRepository.class);
        String id = "ffffffff-ffff-4fff-8fff-ffffffffffff";
        ConversationReadService service = new ConversationReadService(rooms, messages);
        assertThrows(ConversationReadService.ConversationNotFoundException.class,
                () -> service.detail(id, VIEWER));
        when(rooms.findById(id)).thenReturn(Optional.of(room(id,
                List.of(OTHER, "11111111-1111-4111-8111-111111111111"))));
        assertThrows(ConversationReadService.ConversationAccessDeniedException.class,
                () -> service.detail(id, VIEWER));
    }

    @Test
    void rejectsInvalidCursorBeforeQuery() {
        ConversationRepository rooms = mock(ConversationRepository.class);
        ChatMessageRepository messages = mock(ChatMessageRepository.class);
        ConversationReadService service = new ConversationReadService(rooms, messages);
        assertThrows(IllegalArgumentException.class, () -> service.list(VIEWER, 1, "bad-cursor"));
        assertThrows(IllegalArgumentException.class, () -> service.list(VIEWER, 101, null));
        verifyNoInteractions(rooms);
    }

    private Conversation room(String id, List<String> participants) {
        return new Conversation(id, participants, "202fe3fd-626a-41c8-80fd-70af82c1f256",
                null, "ACTIVE", TIME, TIME);
    }
}
