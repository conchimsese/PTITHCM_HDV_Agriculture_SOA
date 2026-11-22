package vn.soa.notification.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import vn.soa.notification.dto.DeadLetterRecord;
import vn.soa.notification.entity.ReferenceType;
import vn.soa.notification.event.EventEnvelope;
import vn.soa.notification.exception.EventIdReusedException;
import vn.soa.notification.exception.InvalidEventException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class KafkaRetryDltServiceTest {

    private KafkaTemplate<String, Object> kafkaTemplate;
    private KafkaRetryDltService retryDltService;
    private final Clock clock = Clock.systemUTC();

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        kafkaTemplate = mock(KafkaTemplate.class);
        retryDltService = new KafkaRetryDltService(kafkaTemplate, clock);
    }

    private ConsumerRecord<String, Object> createRecord(String topic, Object value, int attempt) {
        ConsumerRecord<String, Object> record = new ConsumerRecord<>(topic, 0, 100L, "key-1", value);
        if (attempt > 1) {
            record.headers().add(new RecordHeader("x-notification-attempt", String.valueOf(attempt).getBytes()));
        }
        return record;
    }

    @Test
    @SuppressWarnings("unchecked")
    void transientFailure_Attempt1_ForwardsToRetry1_With5sDelay() {
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        ConsumerRecord<String, Object> record = createRecord("soa.trading.offer.v1", "value-payload", 1);
        retryDltService.handleFailure(record, new RuntimeException("Database timeout"));

        ArgumentCaptor<ProducerRecord<String, Object>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());

        ProducerRecord<String, Object> captured = captor.getValue();
        assertThat(captured.topic()).isEqualTo("soa.trading.offer.v1.notification-retry-1");

        // Next attempt header must be 2
        assertThat(captured.headers().lastHeader("x-notification-attempt")).isNotNull();
        assertThat(new String(captured.headers().lastHeader("x-notification-attempt").value())).isEqualTo("2");
    }

    @Test
    @SuppressWarnings("unchecked")
    void transientFailure_Attempt2_ForwardsToRetry2_With30sDelay() {
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        ConsumerRecord<String, Object> record = createRecord("soa.trading.offer.v1.notification-retry-1", "value-payload", 2);
        retryDltService.handleFailure(record, new RuntimeException("Database connection transient"));

        ArgumentCaptor<ProducerRecord<String, Object>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());

        ProducerRecord<String, Object> captured = captor.getValue();
        assertThat(captured.topic()).isEqualTo("soa.trading.offer.v1.notification-retry-2");
        assertThat(new String(captured.headers().lastHeader("x-notification-attempt").value())).isEqualTo("3");
    }

    @Test
    @SuppressWarnings("unchecked")
    void transientFailure_Attempt3_ForwardsToRetry3_With120sDelay() {
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        ConsumerRecord<String, Object> record = createRecord("soa.trading.offer.v1.notification-retry-2", "value-payload", 3);
        retryDltService.handleFailure(record, new RuntimeException("Connection reset"));

        ArgumentCaptor<ProducerRecord<String, Object>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());

        ProducerRecord<String, Object> captured = captor.getValue();
        assertThat(captured.topic()).isEqualTo("soa.trading.offer.v1.notification-retry-3");
        assertThat(new String(captured.headers().lastHeader("x-notification-attempt").value())).isEqualTo("4");
    }

    @Test
    @SuppressWarnings("unchecked")
    void transientFailure_ExceedingAttempt4_ForwardsToDlt() {
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        ConsumerRecord<String, Object> record = createRecord("soa.trading.offer.v1.notification-retry-3", "value-payload", 4);
        retryDltService.handleFailure(record, new RuntimeException("Persistent failure"));

        ArgumentCaptor<ProducerRecord<String, Object>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());

        ProducerRecord<String, Object> captured = captor.getValue();
        assertThat(captured.topic()).isEqualTo("soa.trading.offer.v1.notification-dlt");
        assertThat(captured.value()).isInstanceOf(DeadLetterRecord.class);
        DeadLetterRecord dlt = (DeadLetterRecord) captured.value();
        assertThat(dlt.attempts()).isEqualTo(4);
    }

    @Test
    @SuppressWarnings("unchecked")
    void nonRetryableFailure_InvalidSchema_ForwardsDirectlyToDlt() {
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        ConsumerRecord<String, Object> record = createRecord("soa.trading.offer.v1", "malformed", 1);
        retryDltService.handleFailure(record, new InvalidEventException("Invalid UUID format"));

        ArgumentCaptor<ProducerRecord<String, Object>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());

        ProducerRecord<String, Object> captured = captor.getValue();
        assertThat(captured.topic()).isEqualTo("soa.trading.offer.v1.notification-dlt");
        DeadLetterRecord dlt = (DeadLetterRecord) captured.value();
        assertThat(dlt.errorCode()).isEqualTo("INVALID_EVENT_SCHEMA");
    }

    @Test
    @SuppressWarnings("unchecked")
    void nonRetryableFailure_EventIdReused_ForwardsDirectlyToDlt() {
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        UUID eventId = UUID.randomUUID();
        EventEnvelope envelope = new EventEnvelope(
                eventId, "OFFER_CREATED", 1, "trading-service",
                Instant.now(), null, List.of(UUID.randomUUID()),
                ReferenceType.OFFER, UUID.randomUUID(), "corr-123", null
        );

        ConsumerRecord<String, Object> record = createRecord("soa.trading.offer.v1", envelope, 1);
        retryDltService.handleFailure(record, new EventIdReusedException("EVENT_ID_REUSED: payload mismatch"));

        ArgumentCaptor<ProducerRecord<String, Object>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());

        ProducerRecord<String, Object> captured = captor.getValue();
        assertThat(captured.topic()).isEqualTo("soa.trading.offer.v1.notification-dlt");
        DeadLetterRecord dlt = (DeadLetterRecord) captured.value();
        assertThat(dlt.errorCode()).isEqualTo("EVENT_ID_REUSED");
        assertThat(dlt.eventId()).isEqualTo(eventId);
        assertThat(dlt.correlationId()).isEqualTo("corr-123");
    }

    @Test
    @SuppressWarnings("unchecked")
    void brokerErrorOnForward_ThrowsException_DoesNotDropRecord() {
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Kafka broker unreachable")));

        ConsumerRecord<String, Object> record = createRecord("soa.trading.offer.v1", "payload", 1);

        assertThatThrownBy(() -> retryDltService.handleFailure(record, new RuntimeException("transient")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Broker forward failed for retry");
    }
}
