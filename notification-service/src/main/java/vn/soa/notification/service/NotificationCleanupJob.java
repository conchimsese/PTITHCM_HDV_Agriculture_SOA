package vn.soa.notification.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.soa.notification.repository.NotificationRepository;

@Service
public class NotificationCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(NotificationCleanupJob.class);

    private final NotificationRepository notificationRepository;
    private final Clock clock;
    private final int retentionDays;

    public NotificationCleanupJob(
            NotificationRepository notificationRepository,
            Clock clock,
            @Value("${app.retention-days:90}") int retentionDays
    ) {
        this.notificationRepository = notificationRepository;
        this.clock = clock;
        this.retentionDays = retentionDays;
    }

    @Scheduled(cron = "${app.cleanup.cron:0 0 2 * * *}") // Run daily at 02:00 AM
    @Transactional
    public int cleanupExpiredNotifications() {
        Instant now = clock.instant();
        Instant cutoff = now.minus(Duration.ofDays(retentionDays));

        log.info("Starting retention cleanup job for notifications older than {} (retentionDays={})", cutoff, retentionDays);
        int deleted = notificationRepository.deleteOlderThan(cutoff);
        log.info("Completed retention cleanup job: deleted {} expired notifications (receipts preserved)", deleted);
        return deleted;
    }
}
