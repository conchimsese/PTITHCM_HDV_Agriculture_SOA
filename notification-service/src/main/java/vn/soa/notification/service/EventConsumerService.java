package vn.soa.notification.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.soa.notification.entity.NotificationEntity;
import vn.soa.notification.entity.NotificationReceiptEntity;
import vn.soa.notification.entity.NotificationReceiptId;
import vn.soa.notification.entity.NotificationStatus;
import vn.soa.notification.entity.NotificationType;
import vn.soa.notification.event.EventEnvelope;
import vn.soa.notification.exception.EventIdReusedException;
import vn.soa.notification.exception.InvalidEventException;
import vn.soa.notification.repository.NotificationReceiptRepository;
import vn.soa.notification.repository.NotificationRepository;
import vn.soa.notification.template.NotificationTemplateEngine;
import vn.soa.notification.template.NotificationTemplateResult;
import vn.soa.notification.util.CanonicalJsonUtil;

@Service
public class EventConsumerService {

    private static final Logger log = LoggerFactory.getLogger(EventConsumerService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationReceiptRepository receiptRepository;
    private final NotificationTemplateEngine templateEngine;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public EventConsumerService(
            NotificationRepository notificationRepository,
            NotificationReceiptRepository receiptRepository,
            NotificationTemplateEngine templateEngine,
            JdbcTemplate jdbcTemplate,
            Clock clock
    ) {
        this.notificationRepository = notificationRepository;
        this.receiptRepository = receiptRepository;
        this.templateEngine = templateEngine;
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    @Transactional
    public void processEvent(EventEnvelope envelope) {
        validateEnvelope(envelope);

        NotificationType notificationType;
        try {
            notificationType = NotificationType.valueOf(envelope.eventType());
        } catch (IllegalArgumentException e) {
            throw new InvalidEventException("Unsupported eventType: " + envelope.eventType());
        }

        // 1. PostgreSQL transaction advisory lock by eventId
        long lockKey = envelope.eventId().getMostSignificantBits();
        jdbcTemplate.execute("SELECT pg_advisory_xact_lock(" + lockKey + ")");

        // 2. Canonicalize SHA-256 payload hash
        String currentHash = CanonicalJsonUtil.computePayloadHash(envelope);

        // 3. Check if any receipt with same eventId exists
        Optional<NotificationReceiptEntity> existingReceipt = receiptRepository.findFirstByIdEventId(envelope.eventId());
        if (existingReceipt.isPresent()) {
            if (!existingReceipt.get().getPayloadHash().equals(currentHash)) {
                log.error("Event ID reused with conflicting payload: eventId={}", envelope.eventId());
                throw new EventIdReusedException("EVENT_ID_REUSED: Event " + envelope.eventId() + " payload mismatch");
            }
            log.info("Duplicate event ignored idempotently: eventId={}", envelope.eventId());
            return;
        }

        Instant now = clock.instant();

        // 4. Render template
        NotificationTemplateResult rendered = templateEngine.render(notificationType, envelope);

        // 5. Deduplicate recipients
        List<UUID> distinctRecipients = envelope.recipientIds().stream()
                .distinct()
                .toList();

        // 6. Persist receipts for all recipients
        for (UUID recipientId : distinctRecipients) {
            NotificationReceiptEntity receipt = new NotificationReceiptEntity(
                    new NotificationReceiptId(envelope.eventId(), recipientId),
                    now,
                    currentHash
            );
            receiptRepository.save(receipt);
        }

        // 7. Persist notifications (unless suppressed e.g. DEPOSIT_STATUS_CHANGED to LOCKED)
        if (!rendered.suppressNotification()) {
            for (UUID recipientId : distinctRecipients) {
                NotificationEntity notification = new NotificationEntity(
                        UUID.randomUUID(),
                        envelope.eventId(),
                        recipientId,
                        notificationType,
                        rendered.title(),
                        rendered.content(),
                        envelope.sourceService(),
                        envelope.eventType(),
                        envelope.referenceType(),
                        envelope.referenceId(),
                        NotificationStatus.UNREAD,
                        envelope.occurredAt(),
                        now,
                        null
                );
                notificationRepository.save(notification);
            }
        } else {
            log.info("Notification suppressed by template engine for eventId={}, type={}", envelope.eventId(), notificationType);
        }
    }

    private void validateEnvelope(EventEnvelope envelope) {
        if (envelope == null) {
            throw new InvalidEventException("Envelope cannot be null");
        }
        if (envelope.eventId() == null) {
            throw new InvalidEventException("eventId cannot be null");
        }
        if (envelope.eventType() == null || envelope.eventType().isBlank()) {
            throw new InvalidEventException("eventType cannot be blank");
        }
        if (envelope.eventVersion() == null || envelope.eventVersion() != 1) {
            throw new InvalidEventException("eventVersion must be 1");
        }
        if (envelope.sourceService() == null || envelope.sourceService().isBlank()) {
            throw new InvalidEventException("sourceService cannot be blank");
        }
        if (envelope.occurredAt() == null) {
            throw new InvalidEventException("occurredAt cannot be null");
        }
        if (envelope.recipientIds() == null || envelope.recipientIds().isEmpty()) {
            throw new InvalidEventException("recipientIds cannot be empty");
        }
        if (envelope.referenceType() == null) {
            throw new InvalidEventException("referenceType cannot be null");
        }
        if (envelope.referenceId() == null) {
            throw new InvalidEventException("referenceId cannot be null");
        }
    }
}
