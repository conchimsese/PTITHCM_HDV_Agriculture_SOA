package vn.soa.notification.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.soa.notification.client.UserServiceClient;
import vn.soa.notification.dto.MarkReadResponse;
import vn.soa.notification.dto.NotificationDto;
import vn.soa.notification.dto.PageResponse;
import vn.soa.notification.dto.UnreadCountResponse;
import vn.soa.notification.entity.NotificationEntity;
import vn.soa.notification.entity.NotificationStatus;
import vn.soa.notification.entity.NotificationType;
import vn.soa.notification.exception.ResourceNotFoundException;
import vn.soa.notification.repository.NotificationRepository;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserServiceClient userServiceClient;
    private final Clock clock;
    private final int retentionDays;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserServiceClient userServiceClient,
            Clock clock,
            @Value("${app.retention-days:90}") int retentionDays
    ) {
        this.notificationRepository = notificationRepository;
        this.userServiceClient = userServiceClient;
        this.clock = clock;
        this.retentionDays = retentionDays;
    }

    private Instant calculateCutoff(Instant now) {
        return now.minus(Duration.ofDays(retentionDays));
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> getNotifications(UUID recipientId, Boolean isRead, NotificationType type, int page, int size) {
        userServiceClient.verifyAccountActive(recipientId);

        Instant now = clock.instant();
        Instant cutoff = calculateCutoff(now);

        int pageSize = Math.min(Math.max(1, size), 100);
        int pageIndex = Math.max(0, page);

        NotificationStatus statusFilter = null;
        if (isRead != null) {
            statusFilter = isRead ? NotificationStatus.READ : NotificationStatus.UNREAD;
        }

        Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(
                Sort.Order.desc("createdAt"),
                Sort.Order.desc("notificationId")
        ));

        Page<NotificationEntity> result = notificationRepository.findByRecipientAndFilters(
                recipientId, cutoff, statusFilter, type, pageable
        );

        var dtos = result.getContent().stream()
                .map(this::toDto)
                .toList();

        return new PageResponse<>(dtos, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public NotificationDto getNotificationById(UUID recipientId, UUID notificationId) {
        userServiceClient.verifyAccountActive(recipientId);

        Instant now = clock.instant();
        Instant cutoff = calculateCutoff(now);

        NotificationEntity entity = notificationRepository.findByIdAndRecipientAndCutoff(notificationId, recipientId, cutoff)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        return toDto(entity);
    }

    @Transactional
    public MarkReadResponse markAsRead(UUID recipientId, UUID notificationId) {
        userServiceClient.verifyAccountActive(recipientId);

        Instant now = clock.instant();
        Instant cutoff = calculateCutoff(now);

        // Conditional atomic update
        int updatedRows = notificationRepository.markAsRead(notificationId, recipientId, now, cutoff);

        // Fetch back current state (or if already READ, keeps original read_at)
        NotificationEntity entity = notificationRepository.findByIdAndRecipientAndCutoff(notificationId, recipientId, cutoff)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        return new MarkReadResponse(entity.getNotificationId(), entity.getStatus(), entity.getReadAt());
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(UUID recipientId) {
        userServiceClient.verifyAccountActive(recipientId);

        Instant now = clock.instant();
        Instant cutoff = calculateCutoff(now);

        long count = notificationRepository.countUnreadByRecipientAndCutoff(recipientId, cutoff);
        return new UnreadCountResponse(count);
    }

    private NotificationDto toDto(NotificationEntity entity) {
        return new NotificationDto(
                entity.getNotificationId(),
                entity.getType(),
                entity.getTitle(),
                entity.getContent(),
                entity.getSourceService(),
                entity.getReferenceType(),
                entity.getReferenceId(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getReadAt()
        );
    }
}
