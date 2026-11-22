package vn.ptit.soa.chat.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.Instant;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Profile("database-learning")
@ConditionalOnProperty(name = "chat.contract.consumer.enabled", havingValue = "true")
public class ChatContractConsumer {
    private final ObjectMapper mapper;
    private final ChatContractService contracts;

    public ChatContractConsumer(ObjectMapper mapper, ChatContractService contracts) {
        this.mapper = mapper;
        this.contracts = contracts;
    }

    @KafkaListener(topics = "soa.contract.lifecycle.v1", groupId = "chat-contract-v1",
            containerFactory = "chatContractKafkaListenerContainerFactory")
    public void receive(ConsumerRecord<String, String> record) throws IOException {
        JsonNode event = mapper.readTree(record.value());
        String type = required(event, "eventType");
        if (event.path("eventVersion").asInt(-1) != 1
                || !"payment-service".equals(required(event, "sourceService"))
                || !"CONTRACT".equals(required(event, "referenceType"))) {
            throw new IllegalArgumentException("Invalid Contract event envelope.");
        }
        JsonNode data = event.path("data");
        String contractId = required(data, "contractId");
        if (!contractId.equals(record.key()) || !contractId.equals(required(event, "referenceId"))) {
            throw new IllegalArgumentException("Contract event key/reference mismatch.");
        }
        String farmer = required(data, "farmerId");
        String trader = required(data, "traderId");
        switch (type) {
            case "CONTRACT_CREATED" -> contracts.contractCreated(contractId,
                    required(data, "offerId"), farmer, trader,
                    Instant.parse(required(event, "occurredAt")));
            case "CONTRACT_STATUS_CHANGED" -> {
                required(data, "previousStatus");
                String status = required(data, "status");
                if (data.path("stateVersion").asLong(-1) < 1) {
                    throw new IllegalArgumentException("Missing Contract stateVersion.");
                }
                Instant occurredAt = event.hasNonNull("occurredAt")
                        ? Instant.parse(event.get("occurredAt").asText()) : Instant.now();
                contracts.contractStatusChanged(contractId, status, farmer, trader, occurredAt,
                        data.path("stateVersion").asLong());
            }
            default -> throw new IllegalArgumentException("Unsupported Contract event type: " + type);
        }
    }

    private String required(JsonNode node, String name) {
        JsonNode value = node.path(name);
        if (!value.isTextual() || value.asText().isBlank()) {
            throw new IllegalArgumentException("Missing Contract event field: " + name);
        }
        return value.asText();
    }
}
