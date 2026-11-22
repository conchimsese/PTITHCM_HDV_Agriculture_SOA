package vn.ptit.soa.chat.conversation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ConversationServiceTest {
    private static final String OFFER = "202fe3fd-626a-41c8-80fd-70af82c1f256";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";

    @Test
    void replayReturnsExistingRoomWithoutInserting() {
        ConversationRepository repository = mock(ConversationRepository.class);
        Conversation room = new Conversation("f72a08bd-33d7-4221-9e55-55d5d7f2e2f0",
                List.of(FARMER, TRADER), OFFER, null, "ACTIVE", Instant.EPOCH, Instant.EPOCH);
        when(repository.findByOfferId(OFFER)).thenReturn(Optional.of(room));

        assertSame(room, new ConversationService(repository).openForAcceptedOffer(OFFER, FARMER, TRADER));
        verify(repository, never()).insert(any());
    }

    @Test
    void replayWithDifferentParticipantsIsRejected() {
        ConversationRepository repository = mock(ConversationRepository.class);
        Conversation room = new Conversation("f72a08bd-33d7-4221-9e55-55d5d7f2e2f0",
                List.of(FARMER, TRADER), OFFER, null, "ACTIVE", Instant.EPOCH, Instant.EPOCH);
        when(repository.findByOfferId(OFFER)).thenReturn(Optional.of(room));

        assertThrows(IllegalArgumentException.class, () -> new ConversationService(repository)
                .openForAcceptedOffer(OFFER, FARMER, "11111111-1111-4111-8111-111111111111"));
        verify(repository, never()).insert(any());
    }
}
