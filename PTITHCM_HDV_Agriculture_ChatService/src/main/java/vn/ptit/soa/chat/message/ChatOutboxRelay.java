package vn.ptit.soa.chat.message;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("database-learning")
@ConditionalOnProperty(name = "chat.outbox.relay.enabled", havingValue = "true")
public class ChatOutboxRelay {
    private static final Logger log = LoggerFactory.getLogger(ChatOutboxRelay.class);
    private static final Duration LEASE = Duration.ofMinutes(2);
    private final String relayId = UUID.randomUUID().toString();
    private final ChatOutboxRepository outbox;
    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper json;

    public ChatOutboxRelay(ChatOutboxRepository outbox, KafkaTemplate<String, String> kafka, ObjectMapper json) {
        this.outbox = outbox;
        this.kafka = kafka;
        this.json = json;
    }

    @Scheduled(initialDelay = 5_000, fixedDelay = 5_000)
    public void publishPending() {
        for (int i = 0; i < 20; i++) {
            ChatOutboxEvent event = outbox.claim(relayId, Instant.now(), LEASE).orElse(null);
            if (event == null) return;
            try {
                String payload = payload(event);
                kafka.send(event.topic(), event.eventKey(), payload).get(30, TimeUnit.SECONDS);
                if (!outbox.markPublished(event.eventId(), relayId, Instant.now())) {
                    log.warn("Outbox event {} was acknowledged by Kafka but could not be marked published; it may be delivered again.",
                            event.eventId());
                    return;
                }
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                outbox.defer(event.eventId(), relayId, Instant.now().plusSeconds(30));
                return;
            } catch (Exception failure) {
                // Keep the same event ID and business data for the next attempt.
                outbox.defer(event.eventId(), relayId, Instant.now().plusSeconds(30));
                log.warn("Could not publish Chat outbox event {}; will retry. Cause: {}",
                        event.eventId(), failure.getClass().getSimpleName());
                return;
            }
        }
    }

    String payload(ChatOutboxEvent event) throws JsonProcessingException {
        return json.writeValueAsString(new Envelope(event.eventId(), event.eventType(),
                event.eventVersion(), event.sourceService(), event.occurredAt(), event.actorId(),
                event.recipientIds(), event.referenceType(), event.referenceId(),
                new TreeMap<>(event.data())));
    }

    record Envelope(String eventId, String eventType, int eventVersion, String sourceService,
            Instant occurredAt, String actorId, List<String> recipientIds, String referenceType,
            String referenceId, Map<String, String> data) {}
}
