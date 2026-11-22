package vn.ptit.soa.payment.contract;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.kafka.core.KafkaTemplate;

class PaymentOutboxRelayTest {
    private static final String EVENT_ID = "ce4db9a7-67b6-4a45-810e-b0a9a23f31eb";
    private static final String CONTRACT_ID = "7f90b32a-9ac2-4b4f-ac8b-6ccf3c266626";
    private static final String STORED_PAYLOAD = "{\"eventId\":\"" + EVENT_ID
            + "\",\"eventType\":\"CONTRACT_CREATED\"}";

    @SuppressWarnings("unchecked")
    @Test
    void marksPublishedOnlyAfterKafkaAckAndSendsStoredPayloadUnchanged() {
        PaymentOutboxRelayRepository outbox = mock(PaymentOutboxRelayRepository.class);
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        PaymentOutboxRelay relay = new PaymentOutboxRelay(outbox, kafka);
        when(outbox.claim(anyString())).thenReturn(Optional.of(new PaymentOutboxRelayRepository.PendingEvent(
                EVENT_ID, "soa.contract.lifecycle.v1", CONTRACT_ID, STORED_PAYLOAD, 1)), Optional.empty());
        when(kafka.send(anyString(), anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(outbox.markPublished(eq(EVENT_ID), anyString())).thenReturn(true);

        relay.publishPending();

        InOrder ordered = inOrder(kafka, outbox);
        ordered.verify(outbox).claim(anyString());
        ordered.verify(kafka).send("soa.contract.lifecycle.v1", CONTRACT_ID, STORED_PAYLOAD);
        ordered.verify(outbox).markPublished(eq(EVENT_ID), anyString());
        verify(outbox, never()).defer(anyString(), anyString());
    }

    @SuppressWarnings("unchecked")
    @Test
    void brokerFailureKeepsEventPendingForRetry() {
        PaymentOutboxRelayRepository outbox = mock(PaymentOutboxRelayRepository.class);
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        PaymentOutboxRelay relay = new PaymentOutboxRelay(outbox, kafka);
        when(outbox.claim(anyString())).thenReturn(Optional.of(new PaymentOutboxRelayRepository.PendingEvent(
                EVENT_ID, "soa.contract.lifecycle.v1", CONTRACT_ID, STORED_PAYLOAD, 1)));
        CompletableFuture<org.springframework.kafka.support.SendResult<String, String>> failed =
                new CompletableFuture<>();
        failed.completeExceptionally(new IllegalStateException("broker down"));
        when(kafka.send(anyString(), anyString(), anyString())).thenReturn(failed);

        relay.publishPending();

        verify(outbox).defer(eq(EVENT_ID), anyString());
        verify(outbox, never()).markPublished(anyString(), anyString());
        verify(outbox, times(1)).claim(anyString());
    }
}
