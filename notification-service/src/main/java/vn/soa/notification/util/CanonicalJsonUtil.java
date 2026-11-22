package vn.soa.notification.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;
import vn.soa.notification.event.EventEnvelope;

public final class CanonicalJsonUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

    private CanonicalJsonUtil() {
    }

    public static String computePayloadHash(EventEnvelope envelope) {
        try {
            ObjectNode root = MAPPER.createObjectNode();
            root.put("eventId", envelope.eventId().toString());
            root.put("eventType", envelope.eventType());
            root.put("eventVersion", envelope.eventVersion());
            root.put("sourceService", envelope.sourceService());
            root.put("occurredAt", envelope.occurredAt().toString());
            if (envelope.actorId() != null) {
                root.put("actorId", envelope.actorId().toString());
            } else {
                root.putNull("actorId");
            }

            // Deduplicate and sort recipientIds deterministically
            List<String> sortedRecipients = new ArrayList<>(
                    envelope.recipientIds().stream()
                            .distinct()
                            .map(UUID::toString)
                            .sorted()
                            .toList()
            );
            ArrayNode recipientsNode = root.putArray("recipientIds");
            sortedRecipients.forEach(recipientsNode::add);

            root.put("referenceType", envelope.referenceType().name());
            root.put("referenceId", envelope.referenceId().toString());

            if (envelope.correlationId() != null) {
                root.put("correlationId", envelope.correlationId());
            } else {
                root.putNull("correlationId");
            }

            // Canonicalize data node
            if (envelope.data() != null) {
                root.set("data", canonicalizeJsonNode(envelope.data()));
            } else {
                root.putNull("data");
            }

            String canonicalJson = MAPPER.writeValueAsString(root);
            return sha256Hex(canonicalJson);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to canonicalize envelope", e);
        }
    }

    private static JsonNode canonicalizeJsonNode(JsonNode node) {
        if (node.isObject()) {
            ObjectNode sortedObject = MAPPER.createObjectNode();
            List<String> fieldNames = new ArrayList<>();
            node.fieldNames().forEachRemaining(fieldNames::add);
            Collections.sort(fieldNames);
            for (String fieldName : fieldNames) {
                sortedObject.set(fieldName, canonicalizeJsonNode(node.get(fieldName)));
            }
            return sortedObject;
        } else if (node.isArray()) {
            ArrayNode arrayNode = MAPPER.createArrayNode();
            for (JsonNode child : node) {
                arrayNode.add(canonicalizeJsonNode(child));
            }
            return arrayNode;
        }
        return node;
    }

    public static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
