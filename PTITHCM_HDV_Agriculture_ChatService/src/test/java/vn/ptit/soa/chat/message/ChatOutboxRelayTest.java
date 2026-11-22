package vn.ptit.soa.chat.message;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;

class ChatOutboxRelayTest {
    private static final String EVENT_ID = "ca314264-d96c-4e96-a932-1ebca0c1ba18";
    private static final String ROOM_ID = "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0";

    private ChatOutboxEvent event() {
        return new ChatOutboxEvent(EVENT_ID, "MESSAGE_CREATED", 1, "chat-service",
                Instant.parse("2026-10-16T00:00:00Z"), "233196d7-d149-451d-8006-91e6563be4f0",
                List.of("e14961fb-7e5a-4613-8837-8cadf6a887de"), "CONVERSATION", ROOM_ID,
                "soa.chat.message.v1", ROOM_ID,
                Map.of("messageId", "a9d2c9e8-c777-4683-8238-1fda1bb4c653",
                        "conversationId", ROOM_ID, "senderId", "233196d7-d149-451d-8006-91e6563be4f0",
                        "recipientId", "e14961fb-7e5a-4613-8837-8cadf6a887de"),
                null, null, null, 0);
    }

    @SuppressWarnings("unchecked")
    @Test
    void ackMarksPublishedAndPayloadContainsOnlyContractEnvelope() throws Exception {
        ChatOutboxRepository repository = mock(ChatOutboxRepository.class);
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        ObjectMapper json = new ObjectMapper().registerModule(new JavaTimeModule());
        ChatOutboxRelay relay = new ChatOutboxRelay(repository, kafka, json);
        when(repository.claim(anyString(), any(), any())).thenReturn(Optional.of(event()), Optional.empty());
        when(kafka.send(anyString(), anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(repository.markPublished(eq(EVENT_ID), anyString(), any())).thenReturn(true);

        relay.publishPending();

        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(kafka).send(eq("soa.chat.message.v1"), eq(ROOM_ID), payload.capture());
        var tree = json.readTree(payload.getValue());
        assertEquals(EVENT_ID, tree.get("eventId").asText());
        assertEquals("MESSAGE_CREATED", tree.get("eventType").asText());
        assertEquals(1, tree.get("eventVersion").asInt());
        assertEquals(10, tree.size());
        assertFalse(tree.has("publishedAt"));
        assertFalse(payload.getValue().contains("attachmentUrl"));
        verify(repository).markPublished(eq(EVENT_ID), anyString(), any());
        verify(repository, never()).defer(anyString(), anyString(), any());
    }

    @SuppressWarnings("unchecked")
    @Test
    void brokerFailureDefersSameEventWithoutMarkingPublished() {
        ChatOutboxRepository repository = mock(ChatOutboxRepository.class);
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        ChatOutboxRelay relay = new ChatOutboxRelay(repository, kafka,
                new ObjectMapper().registerModule(new JavaTimeModule()));
        when(repository.claim(anyString(), any(), any())).thenReturn(Optional.of(event()));
        CompletableFuture<org.springframework.kafka.support.SendResult<String, String>> failed =
                new CompletableFuture<>();
        failed.completeExceptionally(new IllegalStateException("broker down"));
        when(kafka.send(anyString(), anyString(), anyString())).thenReturn(failed);

        relay.publishPending();

        verify(repository).defer(eq(EVENT_ID), anyString(), any());
        verify(repository, never()).markPublished(anyString(), anyString(), any());
        verify(repository, times(1)).claim(anyString(), any(), any());
    }
}
