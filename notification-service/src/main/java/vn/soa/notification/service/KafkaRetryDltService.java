package vn.soa.notification.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import vn.soa.notification.dto.DeadLetterRecord;
import vn.soa.notification.event.EventEnvelope;
import vn.soa.notification.exception.EventIdReusedException;
import vn.soa.notification.exception.InvalidEventException;

@Service
public class KafkaRetryDltService {

    private static final Logger log = LoggerFactory.getLogger(KafkaRetryDltService.class);

    private static final String HEADER_ATTEMPTS = "x-notification-attempt";
    private static final String HEADER_NEXT_PROCESS_TIME = "x-notification-next-time";

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final Clock clock;

    public KafkaRetryDltService(KafkaTemplate<String, Object> kafkaTemplate, Clock clock) {
        this.kafkaTemplate = kafkaTemplate;
        this.clock = clock;
    }

    public int getAttemptCount(ConsumerRecord<?, ?> record) {
        Header header = record.headers().lastHeader(HEADER_ATTEMPTS);
        if (header != null && header.value() != null) {
            try {
                return Integer.parseInt(new String(header.value()));
            } catch (NumberFormatException ignored) {
            }
        }
        return 1;
    }

    public long getDelayForAttempt(int nextAttempt) {
        return switch (nextAttempt) {
            case 2 -> 5_000L;    // 5s
            case 3 -> 30_000L;   // 30s
            case 4 -> 120_000L;  // 120s
            default -> 0L;
        };
    }

    public String getBaseTopic(String topic) {
        if (topic.endsWith(".notification-retry-1") ||
            topic.endsWith(".notification-retry-2") ||
            topic.endsWith(".notification-retry-3")) {
            return topic.substring(0, topic.lastIndexOf(".notification-retry-"));
        }
        if (topic.endsWith(".notification-dlt")) {
            return topic.substring(0, topic.lastIndexOf(".notification-dlt"));
        }
        return topic;
    }

    public boolean isNonRetryable(Throwable ex) {
        return ex instanceof InvalidEventException ||
               ex instanceof EventIdReusedException ||
               ex instanceof IllegalArgumentException;
    }

    public void handleFailure(ConsumerRecord<String, Object> record, Throwable ex) {
        String baseTopic = getBaseTopic(record.topic());
        int currentAttempt = getAttemptCount(record);

        boolean nonRetryable = isNonRetryable(ex);
        int nextAttempt = currentAttempt + 1;

        if (nonRetryable || nextAttempt > 4) {
            forwardToDlt(record, baseTopic, currentAttempt, ex);
        } else {
            forwardToRetry(record, baseTopic, nextAttempt);
        }
    }

    public void forwardToRetry(ConsumerRecord<String, Object> record, String baseTopic, int nextAttempt) {
        int retryIndex = nextAttempt - 1; // attempt 2 -> retry-1 (5s), attempt 3 -> retry-2 (30s), attempt 4 -> retry-3 (120s)
        String retryTopic = baseTopic + ".notification-retry-" + retryIndex;
        long delayMs = getDelayForAttempt(nextAttempt);
        long nextProcessTime = clock.millis() + delayMs;

        ProducerRecord<String, Object> producerRecord = new ProducerRecord<>(retryTopic, record.key(), record.value());

        // Copy existing headers
        record.headers().forEach(h -> {
            if (!HEADER_ATTEMPTS.equals(h.key()) && !HEADER_NEXT_PROCESS_TIME.equals(h.key())) {
                producerRecord.headers().add(h);
            }
        });

        producerRecord.headers().add(new RecordHeader(HEADER_ATTEMPTS, String.valueOf(nextAttempt).getBytes()));
        producerRecord.headers().add(new RecordHeader(HEADER_NEXT_PROCESS_TIME, String.valueOf(nextProcessTime).getBytes()));

        try {
            kafkaTemplate.send(producerRecord).get(5, TimeUnit.SECONDS);
            log.info("Forwarded record to retry topic {} for nextAttempt={}, delay={}ms", retryTopic, nextAttempt, delayMs);
        } catch (Exception e) {
            log.error("Failed to forward record to retry topic {}: {}", retryTopic, e.getMessage(), e);
            throw new RuntimeException("Broker forward failed for retry", e);
        }
    }

    public void forwardToDlt(ConsumerRecord<String, Object> record, String baseTopic, int attempts, Throwable ex) {
        String dltTopic = baseTopic + ".notification-dlt";

        UUID eventId = null;
        String correlationId = null;

        if (record.value() instanceof EventEnvelope envelope) {
            eventId = envelope.eventId();
            correlationId = envelope.correlationId();
        }

        String errorCode = ex.getClass().getSimpleName();
        if (ex instanceof EventIdReusedException) {
            errorCode = "EVENT_ID_REUSED";
        } else if (ex instanceof InvalidEventException) {
            errorCode = "INVALID_EVENT_SCHEMA";
        }

        DeadLetterRecord dltRecord = new DeadLetterRecord(
                record.topic(),
                record.partition(),
                record.offset(),
                eventId,
                correlationId,
                attempts,
                errorCode,
                ex.getMessage(),
                clock.instant(),
                record.value()
        );

        ProducerRecord<String, Object> producerRecord = new ProducerRecord<>(dltTopic, record.key(), dltRecord);
        record.headers().forEach(h -> producerRecord.headers().add(h));

        try {
            kafkaTemplate.send(producerRecord).get(5, TimeUnit.SECONDS);
            log.warn("Forwarded failed event to DLT topic {}: eventId={}, errorCode={}", dltTopic, eventId, errorCode);
        } catch (Exception e) {
            log.error("Failed to forward record to DLT topic {}: {}", dltTopic, e.getMessage(), e);
            throw new RuntimeException("Broker forward failed for DLT", e);
        }
    }
}
