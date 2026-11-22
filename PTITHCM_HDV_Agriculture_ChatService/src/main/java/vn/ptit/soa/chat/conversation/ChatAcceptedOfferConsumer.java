package vn.ptit.soa.chat.conversation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.UUID;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Profile("database-learning")
@ConditionalOnProperty(name = "chat.offer.consumer.enabled", havingValue = "true")
public class ChatAcceptedOfferConsumer {
    private final ObjectMapper mapper;
    private final ConversationService conversations;

    public ChatAcceptedOfferConsumer(ObjectMapper mapper, ConversationService conversations) {
        this.mapper = mapper;
        this.conversations = conversations;
    }

    @KafkaListener(topics = "soa.trading.offer.v1", groupId = "chat-offer-accepted-v1",
            containerFactory = "chatOfferKafkaListenerContainerFactory")
    public void receive(ConsumerRecord<String, String> record) throws IOException {
        JsonNode event = mapper.readTree(record.value());
        String type = required(event, "eventType");
        if ("OFFER_CREATED".equals(type)) {
            // Trading sends both event types to this topic; Chat only opens rooms on acceptance.
            return;
        }
        if (!"OFFER_ACCEPTED".equals(type)) {
            throw new IllegalArgumentException("Unsupported Trading offer event: " + type);
        }
        if (event.path("eventVersion").asInt(-1) != 1
                || !"trading-service".equals(required(event, "sourceService"))
                || !"OFFER".equals(required(event, "referenceType"))) {
            throw new IllegalArgumentException("Invalid OFFER_ACCEPTED envelope.");
        }
        JsonNode data = event.path("data");
        String offerId = uuid(required(data, "offerId"));
        if (!offerId.equals(uuid(record.key())) || !offerId.equals(uuid(required(event, "referenceId")))) {
            throw new IllegalArgumentException("Offer key/reference mismatch.");
        }
        uuid(required(data, "listingId"));
        String farmerId = uuid(required(data, "farmerId"));
        String traderId = uuid(required(data, "traderId"));
        JsonNode recipients = event.path("recipientIds");
        if (!recipients.isArray() || recipients.size() != 1
                || !traderId.equals(uuid(recipients.get(0).asText()))) {
            throw new IllegalArgumentException("Offer recipient must be the trader.");
        }
        conversations.openForAcceptedOffer(offerId, farmerId, traderId);
    }

    private String required(JsonNode node, String name) {
        JsonNode value = node.path(name);
        if (!value.isTextual() || value.asText().isBlank()) {
            throw new IllegalArgumentException("Missing offer event field: " + name);
        }
        return value.asText();
    }

    private String uuid(String value) {
        UUID parsed = UUID.fromString(value);
        if (!parsed.toString().equalsIgnoreCase(value)) throw new IllegalArgumentException("Invalid UUID.");
        return parsed.toString();
    }
}
