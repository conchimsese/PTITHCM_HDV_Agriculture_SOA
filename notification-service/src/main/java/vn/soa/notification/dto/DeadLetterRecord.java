package vn.soa.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record DeadLetterRecord(
        String originalTopic,
        int originalPartition,
        long originalOffset,
        UUID eventId,
        String correlationId,
        int attempts,
        String errorCode,
        String errorMessage,
        Instant failedAt,
        Object payload
) {
}
