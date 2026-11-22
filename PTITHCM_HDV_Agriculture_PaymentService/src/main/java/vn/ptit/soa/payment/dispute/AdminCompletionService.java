package vn.ptit.soa.payment.dispute;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractOutboxRepository;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.DepositOutboxRepository;
import vn.ptit.soa.payment.contract.PaymentTracking;
import vn.ptit.soa.payment.contract.PaymentTrackingRepository;

@Service
@Profile("database-learning")
public class AdminCompletionService {
    private final ContractRepository contracts;
    private final PaymentTrackingRepository tracking;
    private final DisputeRepository disputes;
    private final DisputeEvidenceRepository evidence;
    private final AdminCompletionRepository audit;
    private final ContractOutboxRepository contractOutbox;
    private final DepositOutboxRepository depositOutbox;
    private final Clock clock;

    public AdminCompletionService(ContractRepository contracts, PaymentTrackingRepository tracking,
            DisputeRepository disputes, DisputeEvidenceRepository evidence,
            AdminCompletionRepository audit, ContractOutboxRepository contractOutbox,
            DepositOutboxRepository depositOutbox, Clock clock) {
        this.contracts = contracts;
        this.tracking = tracking;
        this.disputes = disputes;
        this.evidence = evidence;
        this.audit = audit;
        this.contractOutbox = contractOutbox;
        this.depositOutbox = depositOutbox;
        this.clock = clock;
    }

    // Learning-only: production must verify ADMIN/ACTIVE via JWT/access-state.
    @Transactional
    public Result complete(String contractId, String adminId, String reason,
            List<String> evidenceRefs, long expectedVersion) {
        String id = uuid(contractId);
        String admin = uuid(adminId);
        if (reason == null || reason.isBlank() || reason.length() > 5000) {
            throw new IllegalArgumentException("reason must be nonblank and at most 5000 characters.");
        }
        String explanation = reason.trim();
        if (evidenceRefs == null || evidenceRefs.isEmpty() || evidenceRefs.size() > 20) {
            throw new IllegalArgumentException("Admin completion requires 1 to 20 evidence references.");
        }
        List<String> refs = new ArrayList<>();
        for (String ref : evidenceRefs) refs.add(uuid(ref));
        if (new HashSet<>(refs).size() != refs.size()) {
            throw new IllegalArgumentException("Duplicate evidence reference.");
        }
        Contract contract = contracts.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Contract does not exist."));
        if (admin.equals(contract.farmerId()) || admin.equals(contract.traderId())) {
            throw new IllegalArgumentException("Admin cannot complete their own Contract.");
        }
        PaymentTracking deposit = tracking.findByContractIdForUpdate(id)
                .orElseThrow(() -> new IllegalStateException("Contract has no deposit tracking."));
        if ("COMPLETED".equals(contract.status())) {
            AdminCompletionRepository.Audit previous = audit.find(id)
                    .orElseThrow(() -> new IllegalStateException("Contract was completed by the Trader."));
            if (!previous.adminId().equals(admin)
                    || previous.expectedVersion() != expectedVersion
                    || !previous.reason().equals(explanation)
                    || !previous.evidenceRefs().equals(refs)) {
                throw new IllegalStateException("Admin completion request differs from the recorded action.");
            }
            return result(contract, deposit, previous.disputeId());
        }
        Dispute dispute = disputes.findLatestForContract(id)
                .orElseThrow(() -> new IllegalStateException("A resolved dispute is required."));
        if (!"RESOLVED".equals(dispute.status())
                || !"NO_VIOLATION".equals(dispute.outcome())
                || !admin.equals(dispute.assignedAdminId())
                || disputes.activeExists(id)) {
            throw new IllegalStateException("Only the assigned independent Admin may complete after resolution.");
        }
        for (String ref : refs) {
            if (!evidence.belongsToDispute(ref, dispute.disputeId())) {
                throw new IllegalArgumentException("Evidence must belong to this dispute.");
            }
        }
        if (contract.stateVersion() != expectedVersion || !"ACTIVE".equals(contract.status())
                || deposit.disputeHold()
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
        audit.insert(id, dispute.disputeId(), admin, expectedVersion, explanation, refs, now);
        Contract completed = contracts.findById(id).orElseThrow();
        PaymentTracking current = tracking.findByContractId(id).orElseThrow();
        contractOutbox.statusChanged(completed, "ACTIVE", admin, now);
        if ("LOCKED".equals(deposit.status())) {
            depositOutbox.statusChanged(completed, current, "LOCKED", admin, now);
        }
        return result(completed, current, dispute.disputeId());
    }

    private Result result(Contract contract, PaymentTracking deposit, String disputeId) {
        return new Result(contract.contractId(), contract.status(), deposit.paymentTrackingId(),
                deposit.status(), contract.completedConfirmedAt(), disputeId);
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

    public record Result(String contractId, String status, String paymentTrackingId,
            String depositStatus, Instant completedConfirmedAt, String disputeId) {}
}
