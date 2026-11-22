package vn.ptit.soa.payment.security;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import vn.ptit.soa.payment.dispute.AdminCompletionService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments/admin/contracts")
public class SecurePaymentAdminCompletionController {
    private final AdminCompletionService service;
    public SecurePaymentAdminCompletionController(AdminCompletionService service) { this.service = service; }

    @PostMapping("/{contractId}/complete")
    public AdminCompletionService.Result complete(@PathVariable String contractId,
            @RequestBody Request request, @AuthenticationPrincipal Jwt jwt) {
        if (!"ADMIN".equals(jwt.getClaimAsString("role"))) throw new PaymentActionForbiddenException();
        return service.complete(contractId, jwt.getSubject(), request.reason(),
                request.evidenceRefs(), request.expectedVersion());
    }
    public record Request(String reason, List<String> evidenceRefs, long expectedVersion) {}
}
