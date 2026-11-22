package vn.ptit.soa.payment.security;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.dispute.Dispute;
import vn.ptit.soa.payment.dispute.DisputeReadService;
import vn.ptit.soa.payment.dispute.DisputeService;
import vn.ptit.soa.payment.dispute.DisputeSettlementService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments/admin/disputes")
public class SecurePaymentAdminDecisionController {
    private final DisputeReadService reads;
    private final DisputeService disputes;
    private final DisputeSettlementService settlements;

    public SecurePaymentAdminDecisionController(DisputeReadService reads,
            DisputeService disputes, DisputeSettlementService settlements) {
        this.reads = reads;
        this.disputes = disputes;
        this.settlements = settlements;
    }

    @PostMapping("/{disputeId}/decisions")
    public Dispute decide(@PathVariable String disputeId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody DecisionRequest request, @AuthenticationPrincipal Jwt jwt) {
        if (!"ADMIN".equals(jwt.getClaimAsString("role"))) {
            throw new PaymentActionForbiddenException();
        }
        // Hide missing cases and Contracts in which this Admin is a participant.
        reads.dispute(disputeId, jwt.getSubject(), true);
        return switch (request.outcome() == null ? "" : request.outcome()) {
            case "NO_VIOLATION", "INSUFFICIENT_EVIDENCE" -> disputes.closeSafely(
                    disputeId, request.decisionId(), idempotencyKey, jwt.getSubject(),
                    request.expectedVersion(), request.outcome(), request.depositDisposition(),
                    request.reason(), request.evidenceRefs(), request.liableAccountId(),
                    request.violationCode(), request.penaltyPoints());
            case "FARMER_VIOLATION", "TRADER_VIOLATION" -> settlements.settle(
                    disputeId, request.decisionId(), idempotencyKey, jwt.getSubject(),
                    request.expectedVersion(), request.outcome(), request.depositDisposition(),
                    request.reason(), request.evidenceRefs(), request.liableAccountId(),
                    request.violationCode(), request.penaltyPoints());
            case "MUTUAL_CANCEL" -> settlements.cancelMutually(
                    disputeId, request.decisionId(), idempotencyKey, jwt.getSubject(),
                    request.expectedVersion(), request.depositDisposition(), request.reason(),
                    request.evidenceRefs(), request.liableAccountId(), request.violationCode(),
                    request.penaltyPoints());
            default -> throw new IllegalArgumentException("Unsupported decision outcome.");
        };
    }

    public record DecisionRequest(String decisionId, long expectedVersion, String outcome,
            String liableAccountId, String violationCode, String penaltyPoints,
            String depositDisposition, String reason, List<String> evidenceRefs) {}
}
