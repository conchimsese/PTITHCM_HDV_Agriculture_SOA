package vn.soa.notification.consumer;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;
import vn.soa.notification.event.EventEnvelope;
import vn.soa.notification.service.EventConsumerService;
import vn.soa.notification.service.KafkaRetryDltService;

@Component
public class NotificationKafkaListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationKafkaListener.class);

    private final EventConsumerService eventConsumerService;
    private final KafkaRetryDltService retryDltService;

    public NotificationKafkaListener(EventConsumerService eventConsumerService, KafkaRetryDltService retryDltService) {
        this.eventConsumerService = eventConsumerService;
        this.retryDltService = retryDltService;
    }

    @KafkaListener(
            topics = {
                    "soa.trading.offer.v1",
                    "soa.chat.message.v1",
                    "soa.contract.lifecycle.v1",
                    "soa.payment.deposit.v1",
                    "soa.user.reputation.v1",
                    "soa.user.account.v1",

                    "soa.trading.offer.v1.notification-retry-1",
                    "soa.trading.offer.v1.notification-retry-2",
                    "soa.trading.offer.v1.notification-retry-3",

                    "soa.chat.message.v1.notification-retry-1",
                    "soa.chat.message.v1.notification-retry-2",
                    "soa.chat.message.v1.notification-retry-3",

                    "soa.contract.lifecycle.v1.notification-retry-1",
                    "soa.contract.lifecycle.v1.notification-retry-2",
                    "soa.contract.lifecycle.v1.notification-retry-3",

                    "soa.payment.deposit.v1.notification-retry-1",
                    "soa.payment.deposit.v1.notification-retry-2",
                    "soa.payment.deposit.v1.notification-retry-3",

                    "soa.user.reputation.v1.notification-retry-1",
                    "soa.user.reputation.v1.notification-retry-2",
                    "soa.user.reputation.v1.notification-retry-3",

                    "soa.user.account.v1.notification-retry-1",
                    "soa.user.account.v1.notification-retry-2",
                    "soa.user.account.v1.notification-retry-3"
            },
            groupId = "${spring.kafka.consumer.group-id:notification-service-v1}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onMessage(ConsumerRecord<String, Object> record, Acknowledgment ack) {
        log.info("Received event: topic={}, partition={}, offset={}",
                record.topic(), record.partition(), record.offset());

        try {
            if (!(record.value() instanceof EventEnvelope envelope)) {
                throw new IllegalArgumentException("Payload is not an EventEnvelope instance");
            }
            eventConsumerService.processEvent(envelope);
            if (ack != null) {
                ack.acknowledge();
            }
        } catch (Throwable ex) {
            log.error("Error processing record topic={}, offset={}, ex={}",
                    record.topic(), record.offset(), ex.getMessage());
            retryDltService.handleFailure(record, ex);
            // After successful forward to retry or DLT, commit offset
            if (ack != null) {
                ack.acknowledge();
            }
        }
    }
}
