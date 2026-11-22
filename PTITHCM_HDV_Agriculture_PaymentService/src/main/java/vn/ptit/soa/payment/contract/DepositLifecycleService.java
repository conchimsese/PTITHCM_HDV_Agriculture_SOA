package vn.ptit.soa.payment.contract;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ptit.soa.payment.dispute.DisputeRepository;

@Service
@Profile("database-learning")
public class DepositLifecycleService {
    private final ContractRepository contracts;
    private final PaymentTrackingRepository tracking;
    private final ContractOutboxRepository contractOutbox;
    private final DepositOutboxRepository depositOutbox;
    private final Clock clock;
    private final DisputeRepository disputes;

    public DepositLifecycleService(ContractRepository contracts, PaymentTrackingRepository tracking,
            ContractOutboxRepository contractOutbox, DepositOutboxRepository depositOutbox,
            Clock clock, DisputeRepository disputes) {
        this.contracts = contracts;
        this.tracking = tracking;
        this.contractOutbox = contractOutbox;
        this.depositOutbox = depositOutbox;
        this.clock = clock;
        this.disputes = disputes;
    }

    // Learning-only: production must derive actor from JWT and check access-state.
    @Transactional
    public CompleteResult complete(String contractId, String traderId) {
        String id = uuid(contractId);
        String actor = uuid(traderId);
        Contract contract = lockedContract(id);
        if (!contract.traderId().equals(actor)) {
            throw new IllegalArgumentException("Only this Contract's trader can complete it.");
        }
        PaymentTracking deposit = lockedDeposit(id);
        if ("COMPLETED".equals(contract.status())) {
            return completeResult(contract, deposit);
        }
        if (!"ACTIVE".equals(contract.status()) || deposit.disputeHold()
                || disputes.activeExists(id)
                || !("LOCKED".equals(deposit.status()) || "RELEASABLE".equals(deposit.status())
                        || "RELEASED".equals(deposit.status()))) {
            throw new IllegalStateException("Contract cannot be completed in its current state.");
        }
        Instant now = clock.instant();
        contracts.markCompleted(id, contract.stateVersion() + 1, now);
        if ("LOCKED".equals(deposit.status())) {
            tracking.markReleasable(id, deposit.stateVersion() + 1, now, now, now);
        } else {
            tracking.markCompletedAfterEligible(id, deposit.stateVersion() + 1, now);
        }
        Contract completed = contracts.findById(id).orElseThrow();
        PaymentTracking current = tracking.findByContractId(id).orElseThrow();
        contractOutbox.statusChanged(completed, "ACTIVE", actor, now);
        if ("LOCKED".equals(deposit.status())) {
            depositOutbox.statusChanged(completed, current, "LOCKED", actor, now);
        }
        return completeResult(completed, current);
    }

    @Transactional
    public ReleaseResult release(String contractId, String farmerId) {
        String id = uuid(contractId);
        String actor = uuid(farmerId);
        Contract contract = lockedContract(id);
        if (!contract.farmerId().equals(actor)) {
            throw new IllegalArgumentException("Only this Contract's farmer can release its deposit.");
        }
        PaymentTracking deposit = lockedDeposit(id);
        if ("RELEASED".equals(deposit.status())) {
            return releaseResult(contract, deposit);
        }
        if (deposit.disputeHold() || disputes.activeExists(id)
                || !("ACTIVE".equals(contract.status())
                || "COMPLETED".equals(contract.status()))) {
            throw new IllegalStateException("Deposit is not releasable.");
        }
        Instant now = clock.instant();
        if ("LOCKED".equals(deposit.status())) {
            Instant dueAt = deposit.deliveryDate().plus(24, ChronoUnit.HOURS);
            if (now.isBefore(dueAt)) {
                throw new IllegalStateException("Deposit is not releasable yet.");
            }
            tracking.markReleasable(id, deposit.stateVersion() + 1, dueAt, null, now);
            deposit = tracking.findByContractId(id).orElseThrow();
            depositOutbox.statusChanged(contract, deposit, "LOCKED", null, now);
        }
        if (!"RELEASABLE".equals(deposit.status()) || deposit.releaseAt() == null
                || now.isBefore(deposit.releaseAt())) {
            throw new IllegalStateException("Deposit is not releasable.");
        }
        tracking.markReleased(id, deposit.stateVersion() + 1, now);
        PaymentTracking released = tracking.findByContractId(id).orElseThrow();
        depositOutbox.statusChanged(contract, released, "RELEASABLE", actor, now);
        return releaseResult(contract, released);
    }

    @Transactional
    public boolean promoteDue(String contractId) {
        String id = uuid(contractId);
        Contract contract = lockedContract(id);
        PaymentTracking deposit = lockedDeposit(id);
        if (!"LOCKED".equals(deposit.status()) || deposit.disputeHold()
                || disputes.activeExists(id)
                || !("ACTIVE".equals(contract.status()) || "COMPLETED".equals(contract.status()))) {
            return false;
        }
        Instant dueAt = deposit.deliveryDate().plus(24, ChronoUnit.HOURS);
        Instant now = clock.instant();
        if (now.isBefore(dueAt)) return false;
        tracking.markReleasable(id, deposit.stateVersion() + 1, dueAt, null, now);
        PaymentTracking eligible = tracking.findByContractId(id).orElseThrow();
        depositOutbox.statusChanged(contract, eligible, "LOCKED", null, now);
        return true;
    }

    private Contract lockedContract(String id) {
        return contracts.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Contract does not exist."));
    }

    private PaymentTracking lockedDeposit(String id) {
        return tracking.findByContractIdForUpdate(id)
                .orElseThrow(() -> new IllegalStateException("Contract has no deposit tracking."));
    }

    private CompleteResult completeResult(Contract contract, PaymentTracking deposit) {
        return new CompleteResult(contract.contractId(), contract.status(),
                deposit.paymentTrackingId(), deposit.status(), contract.completedConfirmedAt());
    }

    private ReleaseResult releaseResult(Contract contract, PaymentTracking deposit) {
        return new ReleaseResult(deposit.paymentTrackingId(), contract.contractId(),
                deposit.depositAmount(), deposit.status(), contract.status(),
                deposit.releasedAt(), true);
    }

    private String uuid(String value) {
        if (value == null) throw new IllegalArgumentException("ID must be a UUID.");
        try {
            String parsed = UUID.fromString(value).toString();
            if (!parsed.equalsIgnoreCase(value)) throw new IllegalArgumentException();
            return parsed;
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("ID must be a UUID.");
        }
    }

    public record CompleteResult(String contractId, String status, String paymentTrackingId,
            String depositStatus, Instant completedConfirmedAt) {}

    public record ReleaseResult(String paymentTrackingId, String contractId, @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) @io.swagger.v3.oas.annotations.media.Schema(type="string", implementation=String.class) BigDecimal depositAmount,
            String status, String contractStatus, Instant releasedAt, boolean simulated) {}
}
