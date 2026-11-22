package vn.ptit.soa.payment.dispute;

import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("database-learning")
public class EvidenceOrphanCleanupJob {
    private static final Logger log = LoggerFactory.getLogger(EvidenceOrphanCleanupJob.class);
    private final DisputeEvidenceService evidence;

    public EvidenceOrphanCleanupJob(DisputeEvidenceService evidence) {
        this.evidence = evidence;
    }

    @Scheduled(initialDelay = 60000, fixedDelay = 3600000)
    public void cleanup() {
        try {
            int removed = evidence.cleanupOrphans();
            if (removed > 0) log.info("Removed {} orphan dispute evidence files", removed);
        } catch (IOException failure) {
            log.warn("Unable to clean orphan dispute evidence files", failure);
        }
    }
}
