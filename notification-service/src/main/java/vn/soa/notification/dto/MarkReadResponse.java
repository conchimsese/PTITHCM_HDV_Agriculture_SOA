package vn.soa.notification.dto;

import java.time.Instant;
import java.util.UUID;
import vn.soa.notification.entity.NotificationStatus;

public record MarkReadResponse(
        UUID notificationId,
        NotificationStatus status,
        Instant readAt
) {
}
