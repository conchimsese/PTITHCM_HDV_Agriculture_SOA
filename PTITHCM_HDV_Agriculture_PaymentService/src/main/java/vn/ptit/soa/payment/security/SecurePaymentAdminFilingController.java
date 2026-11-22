package vn.ptit.soa.payment.security;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.dispute.AdminDisputeFilingService;
import vn.ptit.soa.payment.dispute.Dispute;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments/admin/contracts")
public class SecurePaymentAdminFilingController {
    private final AdminDisputeFilingService filings;

    public SecurePaymentAdminFilingController(AdminDisputeFilingService filings) {
        this.filings = filings;
    }

    @PostMapping("/{contractId}/disputes")
    @ResponseStatus(HttpStatus.CREATED)
    public OpenView open(@PathVariable String contractId, @RequestBody OpenRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        if (!"ADMIN".equals(jwt.getClaimAsString("role"))) {
            throw new PaymentActionForbiddenException();
        }
        Dispute opened = filings.open(contractId, jwt.getSubject(),
                request.onBehalfOfAccountId(), request.reasonCode(), request.description(),
                request.verificationNote());
        return new OpenView(opened.disputeId(), opened.contractId(), opened.status(),
                opened.depositHold());
    }

    public record OpenRequest(String onBehalfOfAccountId, String reasonCode,
            String description, String verificationNote) {}

    public record OpenView(String disputeId, String contractId, String status,
            boolean depositHold) {}
}
