package vn.soa.notification.controller;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.soa.notification.dto.MarkReadResponse;
import vn.soa.notification.dto.NotificationDto;
import vn.soa.notification.dto.PageResponse;
import vn.soa.notification.dto.UnreadCountResponse;
import vn.soa.notification.entity.NotificationType;
import vn.soa.notification.service.NotificationService;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    private UUID extractRecipientId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    @GetMapping
    public ResponseEntity<PageResponse<NotificationDto>> getNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "isRead", required = false) Boolean isRead,
            @RequestParam(name = "type", required = false) NotificationType type
    ) {
        UUID recipientId = extractRecipientId(jwt);
        PageResponse<NotificationDto> response = notificationService.getNotifications(recipientId, isRead, type, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{notificationId}")
    public ResponseEntity<NotificationDto> getNotification(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("notificationId") UUID notificationId
    ) {
        UUID recipientId = extractRecipientId(jwt);
        NotificationDto response = notificationService.getNotificationById(recipientId, notificationId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<MarkReadResponse> markAsRead(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("notificationId") UUID notificationId
    ) {
        UUID recipientId = extractRecipientId(jwt);
        MarkReadResponse response = notificationService.markAsRead(recipientId, notificationId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID recipientId = extractRecipientId(jwt);
        UnreadCountResponse response = notificationService.getUnreadCount(recipientId);
        return ResponseEntity.ok(response);
    }
}
