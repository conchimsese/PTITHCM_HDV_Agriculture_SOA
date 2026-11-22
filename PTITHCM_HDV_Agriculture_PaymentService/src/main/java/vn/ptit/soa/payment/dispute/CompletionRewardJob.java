package vn.ptit.soa.payment.dispute;

import java.time.Clock;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("database-learning")
@ConditionalOnProperty(name="payment.rewards.enabled", havingValue="true")
public class CompletionRewardJob {
    private static final Logger log = LoggerFactory.getLogger(CompletionRewardJob.class);
    private final CompletionRewardRepository rewards;
    private final CompletionRewardService service;
    private final Clock clock;

    public CompletionRewardJob(CompletionRewardRepository rewards, CompletionRewardService service,
            Clock clock) {
        this.rewards = rewards;
        this.service = service;
        this.clock = clock;
    }

    @Scheduled(initialDelay=5000, fixedDelayString="${payment.rewards.poll-ms:60000}")
    public void awardDue() {
        for (String contractId : rewards.findDue(clock.instant().minus(72, ChronoUnit.HOURS), 100)) {
            try {
                service.award(contractId);
            } catch (RuntimeException failure) {
                log.warn("Reward decision failed for Contract {}; retry next poll. Cause: {}",
                        contractId, failure.getClass().getSimpleName());
            }
        }
    }
}
