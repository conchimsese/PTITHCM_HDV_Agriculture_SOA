package vn.ptit.soa.payment.contract;

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
@ConditionalOnProperty(name = "payment.outbox.relay.enabled", havingValue = "true")
public class PaymentOutboxRelay {
    private static final Logger log = LoggerFactory.getLogger(PaymentOutboxRelay.class);
    private final String relayId = UUID.randomUUID().toString();
    private final PaymentOutboxRelayRepository outbox;
    private final KafkaTemplate<String, String> kafka;

    public PaymentOutboxRelay(PaymentOutboxRelayRepository outbox, KafkaTemplate<String, String> kafka) {
        this.outbox = outbox;
        this.kafka = kafka;
    }

    @Scheduled(initialDelay = 5_000, fixedDelay = 5_000)
    public void publishPending() {
        for (int i = 0; i < 20; i++) {
            PaymentOutboxRelayRepository.PendingEvent event = outbox.claim(relayId).orElse(null);
            if (event == null) return;
            try {
                kafka.send(event.topic(), event.eventKey(), event.payload()).get(30, TimeUnit.SECONDS);
                if (!outbox.markPublished(event.eventId(), relayId)) {
                    log.warn("Payment event {} reached Kafka but could not be marked published; it may be delivered again.",
                            event.eventId());
                    return;
                }
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                outbox.defer(event.eventId(), relayId);
                return;
            } catch (Exception failure) {
                outbox.defer(event.eventId(), relayId);
                log.warn("Could not publish Payment event {}; retry scheduled. Cause: {}",
                        event.eventId(), failure.getClass().getSimpleName());
                return;
            }
        }
    }
}
