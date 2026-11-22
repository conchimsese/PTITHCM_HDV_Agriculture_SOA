package vn.ptit.soa.payment.dispute;

import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;

@Service
@Profile("database-learning")
public class DecisionReversalService {
    private final DisputeRepository disputes;
    private final DecisionReversalRepository reversals;
    private final DisputeEvidenceRepository evidence;
    private final ContractRepository contracts;
    private final Clock clock;
    private final ReputationDecisionOutboxRepository reputationOutbox;

    public DecisionReversalService(DisputeRepository disputes,
            DecisionReversalRepository reversals, DisputeEvidenceRepository evidence,
            ContractRepository contracts, ReputationDecisionOutboxRepository reputationOutbox,
            Clock clock) {
        this.disputes = disputes;
        this.reversals = reversals;
        this.evidence = evidence;
        this.contracts = contracts;
        this.clock = clock;
        this.reputationOutbox = reputationOutbox;
    }

    @Transactional
    public DecisionReversal reverse(String originalDecisionId, String reversalDecisionId,
            String adminId, String reason, List<String> evidenceRefs) {
        String originalId = uuid(originalDecisionId);
        String reversalId = uuid(reversalDecisionId);
        String admin = uuid(adminId);
        if (originalId.equals(reversalId)) {
            throw new IllegalArgumentException("Reversal ID must differ from original decision ID.");
        }
        if (reason == null || reason.isBlank() || reason.length() > 5000) {
            throw new IllegalArgumentException("reason must be 1..5000 characters.");
        }
        if (evidenceRefs == null || evidenceRefs.isEmpty() || evidenceRefs.size() > 20) {
            throw new IllegalArgumentException("Reversal requires 1..20 evidence references.");
        }
        List<String> refs = evidenceRefs.stream().map(this::uuid).toList();
        if (new HashSet<>(refs).size() != refs.size()) {
            throw new IllegalArgumentException("Duplicate evidence reference.");
        }
        DisputeDecision original = disputes.findDecision(originalId)
                .orElseThrow(DisputeReadNotFoundException::new);
        Dispute snapshot = disputes.findById(original.disputeId())
                .orElseThrow(DisputeReadNotFoundException::new);
        Contract contract = contracts.findByIdForUpdate(snapshot.contractId())
                .orElseThrow(DisputeReadNotFoundException::new);
        if (admin.equals(original.adminId()) || admin.equals(contract.farmerId())
                || admin.equals(contract.traderId())) {
            throw new DecisionReversalForbiddenException();
        }
        Dispute current = disputes.findByIdForUpdate(snapshot.disputeId())
                .orElseThrow(DisputeReadNotFoundException::new);
        DecisionReversal existing = reversals.findByOriginal(originalId).orElse(null);
        if (existing != null) {
            if (!existing.reversalDecisionId().equals(reversalId)
                    || !existing.adminId().equals(admin)
                    || !existing.reason().equals(reason.trim())
                    || !existing.evidenceRefs().equals(refs)) {
                throw new IllegalStateException("Original decision was already reversed differently.");
            }
            return existing;
        }
        if (!"RESOLVED".equals(current.status()) || current.decisionVersion() != 1) {
            throw new IllegalStateException("Only a resolved, unreversed decision can be reversed.");
        }
        for (String ref : refs) {
            if (!evidence.belongsToDispute(ref, current.disputeId())) {
                throw new IllegalArgumentException("Evidence must belong to this dispute.");
            }
        }
        Instant now = clock.instant();
        DecisionReversal reversal = new DecisionReversal(reversalId, originalId,
                current.disputeId(), admin, reason.trim(), refs, now);
        reversals.insert(reversal);
        disputes.recordReversal(current.disputeId(), current.decisionVersion(), now);
        reputationOutbox.reversePenalty(contract, reversal, current.decisionVersion() + 1);
        return reversal;
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
