package vn.ptit.soa.payment.contract;

import java.time.Clock;
import java.time.temporal.ChronoUnit;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("learning & database-learning")
public class DueDepositJob {
    private final PaymentTrackingRepository tracking;
    private final DepositLifecycleService lifecycle;
    private final Clock clock;

    public DueDepositJob(PaymentTrackingRepository tracking,
            DepositLifecycleService lifecycle, Clock clock) {
        this.tracking = tracking;
        this.lifecycle = lifecycle;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${LEARNING_DUE_DEPOSIT_POLL_MS:60000}")
    public void promoteDueDeposits() {
        for (String contractId : tracking.findDueContractIds(
                clock.instant().minus(24, ChronoUnit.HOURS), 100)) {
            lifecycle.promoteDue(contractId);
        }
    }
}
