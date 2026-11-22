package vn.soa.notification.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import vn.soa.notification.entity.ReferenceType;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EventEnvelope(
        UUID eventId,
        String eventType,
        Integer eventVersion,
        String sourceService,
        Instant occurredAt,
        UUID actorId,
        List<UUID> recipientIds,
        ReferenceType referenceType,
        UUID referenceId,
        String correlationId,
        JsonNode data
) {
}
