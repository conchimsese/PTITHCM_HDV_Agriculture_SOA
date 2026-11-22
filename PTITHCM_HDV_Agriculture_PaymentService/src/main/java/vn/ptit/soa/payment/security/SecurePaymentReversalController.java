package vn.ptit.soa.payment.security;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.dispute.DecisionReversal;
import vn.ptit.soa.payment.dispute.DecisionReversalService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments/admin/decisions")
public class SecurePaymentReversalController {
    private final DecisionReversalService reversals;

    public SecurePaymentReversalController(DecisionReversalService reversals) {
        this.reversals = reversals;
    }

    @PostMapping("/{decisionId}/reversal")
    public DecisionReversal reverse(@PathVariable String decisionId,
            @RequestBody ReversalRequest request, @AuthenticationPrincipal Jwt jwt) {
        if (!"ADMIN".equals(jwt.getClaimAsString("role"))) {
            throw new PaymentActionForbiddenException();
        }
        return reversals.reverse(decisionId, request.reversalDecisionId(),
                jwt.getSubject(), request.reason(), request.evidenceRefs());
    }

    public record ReversalRequest(String reversalDecisionId, String reason,
            List<String> evidenceRefs) {}
}
