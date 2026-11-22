package vn.ptit.soa.payment.dispute;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.PaymentTracking;
import vn.ptit.soa.payment.contract.PaymentTrackingRepository;

@Service
@Profile("database-learning")
public class DisputeService {
    private final DisputeRepository disputes;
    private final ContractRepository contracts;
    private final PaymentTrackingRepository tracking;
    private final Clock clock;
    private final DisputeEvidenceRepository evidence;

    public DisputeService(DisputeRepository disputes, ContractRepository contracts,
            PaymentTrackingRepository tracking, Clock clock,
            DisputeEvidenceRepository evidence) {
        this.disputes = disputes;
        this.contracts = contracts;
        this.tracking = tracking;
        this.clock = clock;
        this.evidence = evidence;
    }

    // Learning-only: actor IDs must come from verified JWT/access-state in production.
    @Transactional
    public Dispute open(String contractId, String actorId, String reasonCode,
            String description, List<String> evidenceRefs) {
        String id = uuid(contractId);
        String actor = uuid(actorId);
        requireNoEvidenceRefs(evidenceRefs);
        String reason = required(reasonCode, "reasonCode", 80);
        String details = required(description, "description", 5000);
        Contract contract = lockedContract(id);
        if (!isParticipant(contract, actor)) {
            throw new IllegalArgumentException("Only a Contract participant can open a dispute.");
        }
        PaymentTracking deposit = lockedDeposit(id);
        if (!("ACTIVE".equals(contract.status()) || "COMPLETED".equals(contract.status()))) {
            throw new IllegalStateException("Contract cannot be disputed in its current state.");
        }
        if (disputes.activeExists(id)) {
            throw new IllegalStateException("Contract already has an active dispute.");
        }
        boolean hold = "LOCKED".equals(deposit.status()) || "RELEASABLE".equals(deposit.status());
        Instant now = clock.instant();
        if (hold) tracking.setDisputeHold(id, true, now);
        Dispute dispute = new Dispute(UUID.randomUUID().toString(), id, actor,
                reason, details, "OPEN", hold, null, null, null, null,
                1, 0, now, now);
        disputes.insert(dispute);
        return dispute;
    }

    public Dispute findForParticipant(String disputeId, String actorId) {
        Dispute dispute = find(uuid(disputeId));
        Contract contract = contracts.findById(dispute.contractId()).orElseThrow();
        if (!isParticipant(contract, uuid(actorId))) {
            throw new IllegalArgumentException("Only a Contract participant can view this dispute.");
        }
        return dispute;
    }

    public Dispute findForAdmin(String disputeId, String adminId) {
        Dispute dispute = find(uuid(disputeId));
        Contract contract = contracts.findById(dispute.contractId()).orElseThrow();
        requireIndependentAdmin(contract, uuid(adminId));
        return dispute;
    }

    public Dispute requireEvidenceAccess(String disputeId, String actorId,
            boolean asAdmin, boolean forUpload) {
        String id = uuid(disputeId);
        String actor = uuid(actorId);
        Dispute dispute = (forUpload ? disputes.findByIdForUpdate(id) : disputes.findById(id))
                .orElseThrow(EvidenceNotFoundException::new);
        Contract contract = contracts.findById(dispute.contractId())
                .orElseThrow(EvidenceNotFoundException::new);
        boolean allowed = asAdmin
                ? !isParticipant(contract, actor) && actor.equals(dispute.assignedAdminId())
                : isParticipant(contract, actor);
        if (!allowed || (forUpload && "RESOLVED".equals(dispute.status()))) {
            throw new EvidenceNotFoundException();
        }
        return dispute;
    }

    public String requireEvidenceSource(Dispute dispute, String sourceAccountId) {
        String source = uuid(sourceAccountId);
        Contract contract = contracts.findById(dispute.contractId())
                .orElseThrow(EvidenceNotFoundException::new);
        if (!isParticipant(contract, source)) {
            throw new IllegalArgumentException("Evidence source must be a Contract participant.");
        }
        return source;
    }

    @Transactional
    public Dispute review(String disputeId, String adminId, String note, Long expectedVersion) {
        String id = uuid(disputeId);
        String admin = uuid(adminId);
        String reviewNote = required(note, "note", 5000);
        Dispute snapshot = find(id);
        Contract contract = lockedContract(snapshot.contractId());
        requireIndependentAdmin(contract, admin);
        Dispute current = lockedDispute(id);
        if ("RESOLVED".equals(current.status())) {
            throw new IllegalStateException("A resolved dispute cannot be reviewed again.");
        }
        if ("UNDER_REVIEW".equals(current.status()) && admin.equals(current.assignedAdminId())) {
            return current;
        }
        if (expectedVersion != null && expectedVersion != current.stateVersion()) {
            throw new IllegalStateException("Dispute version changed; reload before review.");
        }
        if ("UNDER_REVIEW".equals(current.status()) && expectedVersion == null) {
            throw new IllegalStateException("Handover requires expectedVersion.");
        }
        Instant now = clock.instant();
        Instant due = current.responseDueAt() == null
                ? now.plus(48, ChronoUnit.HOURS) : current.responseDueAt();
        disputes.review(id, current.assignedAdminId(), admin, reviewNote,
                due, current.stateVersion() + 1, now);
        return find(id);
    }

    @Transactional
    public Dispute closeSafely(String disputeId, String decisionId, String idempotencyKey,
            String adminId, long expectedVersion, String outcome, String disposition,
            String reason, List<String> evidenceRefs, String liableAccountId,
            String violationCode, String penaltyPoints) {
        String id = uuid(disputeId);
        String decision = uuid(decisionId);
        String admin = uuid(adminId);
        if (!decision.equals(uuid(idempotencyKey))) {
            throw new IllegalArgumentException("Idempotency-Key must equal decisionId.");
        }
        if (!("NO_VIOLATION".equals(outcome) || "INSUFFICIENT_EVIDENCE".equals(outcome))
                || !"NONE".equals(disposition) || liableAccountId != null
                || violationCode != null || penaltyPoints != null) {
            throw new IllegalArgumentException("This learning phase only closes without penalty or settlement.");
        }
        String decisionReason = required(reason, "reason", 5000);
        List<String> verifiedRefs = verifiedEvidenceRefs(id, evidenceRefs);
        DisputeDecision submitted = new DisputeDecision(decision, id, admin,
                expectedVersion, outcome, disposition, decisionReason, verifiedRefs);
        Dispute snapshot = find(id);
        Contract contract = lockedContract(snapshot.contractId());
        requireIndependentAdmin(contract, admin);
        PaymentTracking deposit = lockedDeposit(contract.contractId());
        Dispute current = lockedDispute(id);
        var existing = disputes.findDecision(decision);
        if (existing.isPresent()) {
            if (!existing.get().equals(submitted)) {
                throw new IllegalStateException("Idempotency key was reused with different content.");
            }
            return current;
        }
        if (!"UNDER_REVIEW".equals(current.status())
                || !admin.equals(current.assignedAdminId())) {
            throw new IllegalStateException("Only the assigned independent Admin can decide this dispute.");
        }
        if (current.stateVersion() != expectedVersion) {
            throw new IllegalStateException("Dispute version changed; reload before decision.");
        }
        if (current.depositHold() && !deposit.disputeHold()) {
            throw new IllegalStateException("Deposit hold and dispute state disagree.");
        }
        Instant now = clock.instant();
        disputes.insertDecision(submitted, now);
        disputes.resolve(id, outcome, current.stateVersion() + 1,
                current.decisionVersion() + 1, now);
        if (current.depositHold()) tracking.setDisputeHold(contract.contractId(), false, now);
        return find(id);
    }

    private Dispute find(String id) {
        return disputes.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispute does not exist."));
    }

    private Dispute lockedDispute(String id) {
        return disputes.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispute does not exist."));
    }

    private Contract lockedContract(String id) {
        return contracts.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Contract does not exist."));
    }

    private PaymentTracking lockedDeposit(String id) {
        return tracking.findByContractIdForUpdate(id)
                .orElseThrow(() -> new IllegalStateException("Contract has no deposit tracking."));
    }

    private boolean isParticipant(Contract contract, String actor) {
        return actor.equals(contract.farmerId()) || actor.equals(contract.traderId());
    }

    private void requireIndependentAdmin(Contract contract, String admin) {
        if (isParticipant(contract, admin)) {
            throw new IllegalArgumentException("Admin cannot review their own Contract.");
        }
    }

    private void requireNoEvidenceRefs(List<String> refs) {
        if (refs != null && !refs.isEmpty()) {
            throw new IllegalArgumentException("Evidence upload is not available in this learning phase.");
        }
    }

    private List<String> verifiedEvidenceRefs(String disputeId, List<String> refs) {
        if (refs == null || refs.isEmpty()) return List.of();
        if (refs.size() > 20) throw new IllegalArgumentException("Too many evidence references.");
        List<String> verified = new ArrayList<>();
        for (String ref : refs) {
            String id = uuid(ref);
            if (!evidence.belongsToDispute(id, disputeId)) {
                throw new IllegalArgumentException("Evidence must belong to this dispute.");
            }
            verified.add(id);
        }
        if (new HashSet<>(verified).size() != verified.size()) {
            throw new IllegalArgumentException("Duplicate evidence reference.");
        }
        return List.copyOf(verified);
    }

    private String required(String value, String name, int maxLength) {
        if (value == null || value.isBlank() || value.length() > maxLength) {
            throw new IllegalArgumentException(name + " must be nonblank and at most " + maxLength + " characters.");
        }
        return value.trim();
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
}
