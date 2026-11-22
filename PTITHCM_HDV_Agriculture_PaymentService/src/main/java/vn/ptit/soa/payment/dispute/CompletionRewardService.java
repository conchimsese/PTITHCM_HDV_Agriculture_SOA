package vn.ptit.soa.payment.dispute;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;

@Service
@Profile("database-learning")
public class CompletionRewardService {
    private final ContractRepository contracts;
    private final CompletionRewardRepository rewards;
    private final ReputationDecisionOutboxRepository outbox;
    private final Clock clock;

    public CompletionRewardService(ContractRepository contracts, CompletionRewardRepository rewards,
            ReputationDecisionOutboxRepository outbox, Clock clock) {
        this.contracts = contracts;
        this.rewards = rewards;
        this.outbox = outbox;
        this.clock = clock;
    }

    @Transactional
    public void award(String contractId) {
        Contract contract = contracts.findByIdForUpdate(contractId).orElse(null);
        Instant now = clock.instant();
        if (contract == null || !"COMPLETED".equals(contract.status())
                || contract.completedConfirmedAt() == null
                || contract.completedConfirmedAt().isAfter(now.minus(72, ChronoUnit.HOURS))
                || rewards.blocked(contractId)) return;
        for (String account : List.of(contract.farmerId(), contract.traderId())) {
            String decisionId = UUID.randomUUID().toString();
            if (rewards.insert(contractId, account, decisionId, now)) {
                outbox.completionReward(contract, decisionId, account, now);
            }
        }
    }
}
