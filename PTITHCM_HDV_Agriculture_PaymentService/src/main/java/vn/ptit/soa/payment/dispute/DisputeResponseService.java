package vn.ptit.soa.payment.dispute;

import java.time.Clock;
import java.util.ArrayList;
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
public class DisputeResponseService {
    private final DisputeRepository disputes;
    private final DisputeResponseRepository responses;
    private final DisputeEvidenceRepository evidence;
    private final ContractRepository contracts;
    private final Clock clock;
    private final DisputeService disputeService;

    public DisputeResponseService(DisputeRepository disputes,
            DisputeResponseRepository responses, DisputeEvidenceRepository evidence,
            ContractRepository contracts, Clock clock, DisputeService disputeService) {
        this.disputes = disputes;
        this.responses = responses;
        this.evidence = evidence;
        this.contracts = contracts;
        this.clock = clock;
        this.disputeService = disputeService;
    }

    // Learning-only: actor ID must come from verified JWT/access-state in production.
    @Transactional
    public DisputeResponse respond(String disputeId, String actorId,
            String statement, List<String> evidenceRefs) {
        String id = uuid(disputeId);
        String actor = uuid(actorId);
        Dispute dispute = disputes.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispute does not exist."));
        Contract contract = contracts.findById(dispute.contractId()).orElseThrow();
        if (!actor.equals(contract.farmerId()) && !actor.equals(contract.traderId())) {
            throw new IllegalArgumentException("Only a Contract participant can respond.");
        }
        if ("RESOLVED".equals(dispute.status())) {
            throw new IllegalStateException("A resolved dispute cannot receive a response.");
        }
        if (statement == null || statement.isBlank() || statement.length() > 5000) {
            throw new IllegalArgumentException("statement must be nonblank and at most 5000 characters.");
        }
        List<String> refs = new ArrayList<>();
        if (evidenceRefs != null) {
            if (evidenceRefs.size() > 20) {
                throw new IllegalArgumentException("Too many evidence references.");
            }
            for (String reference : evidenceRefs) {
                String evidenceId = uuid(reference);
                if (!evidence.belongsTo(evidenceId, id, actor)) {
                    throw new IllegalArgumentException("Evidence must belong to this dispute and uploader.");
                }
                refs.add(evidenceId);
            }
        }
        if (new HashSet<>(refs).size() != refs.size()) {
            throw new IllegalArgumentException("Duplicate evidence reference.");
        }
        DisputeResponse response = new DisputeResponse(UUID.randomUUID().toString(),
                id, actor, statement.trim(), List.copyOf(refs), clock.instant());
        responses.insert(response);
        return response;
    }

    public List<DisputeResponse> list(String disputeId, String actorId, boolean asAdmin) {
        Dispute dispute = asAdmin
                ? disputeService.findForAdmin(disputeId, actorId)
                : disputeService.findForParticipant(disputeId, actorId);
        return responses.findByDispute(dispute.disputeId());
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
