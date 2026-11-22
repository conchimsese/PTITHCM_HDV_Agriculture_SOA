package vn.soa.notification.dto;

import java.time.Instant;
import java.util.UUID;
import vn.soa.notification.entity.NotificationStatus;
import vn.soa.notification.entity.NotificationType;
import vn.soa.notification.entity.ReferenceType;

public record NotificationDto(
        UUID notificationId,
        NotificationType type,
        String title,
        String content,
        String sourceService,
        ReferenceType referenceType,
        UUID referenceId,
        NotificationStatus status,
        Instant createdAt,
        Instant readAt
) {
}
