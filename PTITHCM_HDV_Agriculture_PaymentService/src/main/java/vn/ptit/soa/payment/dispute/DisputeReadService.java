package vn.ptit.soa.payment.dispute;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;

@Service
@Profile("database-learning")
public class DisputeReadService {
    private final ContractRepository contracts;
    private final DisputeRepository disputes;
    private final AdminDisputeFilingRepository filings;
    private final DecisionReversalRepository reversals;

    public DisputeReadService(ContractRepository contracts, DisputeRepository disputes,
            AdminDisputeFilingRepository filings, DecisionReversalRepository reversals) {
        this.contracts = contracts;
        this.disputes = disputes;
        this.filings = filings;
        this.reversals = reversals;
    }

    // Learning-only: production must derive actor and role from verified JWT/access-state.
    public ContractDetail contract(String contractId, String actorId) {
        Contract contract = contracts.findById(uuid(contractId))
                .orElseThrow(DisputeReadNotFoundException::new);
        if (!participant(contract, uuid(actorId))) throw new DisputeReadNotFoundException();
        DisputeSummary summary = disputes.findLatestForContract(contract.contractId())
                .map(dispute -> new DisputeSummary(dispute.disputeId(), dispute.status(),
                        dispute.responseDueAt(), dispute.depositHold()))
                .orElse(null);
        return new ContractDetail(contract.contractId(), contract.offerId(),
                contract.conversationId(), contract.farmerId(), contract.traderId(),
                contract.totalAmount(), contract.terms(), contract.deliveryDate(),
                contract.status(), contract.penaltyRate(), contract.completedConfirmedAt(),
                contract.stateVersion(), contract.createdAt(), contract.updatedAt(), summary);
    }

    public DisputeDetail dispute(String disputeId, String actorId, boolean asAdmin) {
        Dispute dispute = disputes.findById(uuid(disputeId))
                .orElseThrow(DisputeReadNotFoundException::new);
        Contract contract = contracts.findById(dispute.contractId())
                .orElseThrow(DisputeReadNotFoundException::new);
        String actor = uuid(actorId);
        if (asAdmin ? participant(contract, actor) : !participant(contract, actor)) {
            throw new DisputeReadNotFoundException();
        }
        DisputeDecision decision = disputes.findDecisionForDispute(dispute.disputeId()).orElse(null);
        DecisionReversal reversal = reversals.findByDispute(dispute.disputeId()).orElse(null);
        AdminDisputeFilingRepository.Filing filing = asAdmin
                ? filings.find(dispute.disputeId()).orElse(null) : null;
        return new DisputeDetail(dispute.disputeId(), dispute.contractId(), contract.farmerId(),
                contract.traderId(), dispute.openedBy(),
                dispute.reasonCode(), dispute.description(), dispute.status(),
                dispute.depositHold(), dispute.assignedAdminId(), dispute.responseDueAt(),
                dispute.resolvedAt(), dispute.outcome(), dispute.stateVersion(),
                dispute.decisionVersion(), dispute.createdAt(), dispute.updatedAt(), decision,
                reversal, filing);
    }

    private boolean participant(Contract contract, String actor) {
        return actor.equals(contract.farmerId()) || actor.equals(contract.traderId());
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

    public record DisputeSummary(String disputeId, String status, Instant responseDueAt,
            boolean depositHold) {}

    public record ContractDetail(String contractId, String offerId, String conversationId,
            String farmerId, String traderId, @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) @io.swagger.v3.oas.annotations.media.Schema(type="string", implementation=String.class) BigDecimal totalAmount, String terms,
            Instant deliveryDate, String status, BigDecimal penaltyRate,
            Instant completedConfirmedAt, long stateVersion, Instant createdAt,
            Instant updatedAt, DisputeSummary disputeSummary) {}

    public record DisputeDetail(String disputeId, String contractId, String farmerId,
            String traderId, String openedBy,
            String reasonCode, String description, String status, boolean depositHold,
            String assignedAdminId, Instant responseDueAt, Instant resolvedAt,
            String outcome, long stateVersion, long decisionVersion, Instant createdAt,
            Instant updatedAt, DisputeDecision decision, DecisionReversal reversal,
            AdminDisputeFilingRepository.Filing adminFiling) {}
}
