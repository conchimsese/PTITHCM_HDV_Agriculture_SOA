package vn.ptit.soa.payment.security;

import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.dispute.AdminDisputeListService;
import vn.ptit.soa.payment.dispute.Dispute;
import vn.ptit.soa.payment.dispute.DisputeReadService;
import vn.ptit.soa.payment.dispute.DisputeService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments/admin/disputes")
public class SecurePaymentAdminDisputeController {
    private final AdminDisputeListService adminList;
    private final DisputeReadService reads;
    private final DisputeService disputes;

    public SecurePaymentAdminDisputeController(AdminDisputeListService adminList,
            DisputeReadService reads, DisputeService disputes) {
        this.adminList = adminList;
        this.reads = reads;
        this.disputes = disputes;
    }

    @GetMapping
    public AdminDisputeListService.Page list(@RequestParam(required = false) String status,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal Jwt jwt) {
        requireAdmin(jwt);
        return adminList.list(jwt.getSubject(), status, cursor, limit);
    }

    @PostMapping("/{disputeId}/review")
    public Dispute review(@PathVariable String disputeId, @RequestBody ReviewRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        requireAdmin(jwt);
        // A missing dispute and one belonging to this Admin's own Contract look the same.
        reads.dispute(disputeId, jwt.getSubject(), true);
        return disputes.review(disputeId, jwt.getSubject(), request.note(), request.expectedVersion());
    }

    private void requireAdmin(Jwt jwt) {
        if (!"ADMIN".equals(jwt.getClaimAsString("role"))) {
            throw new PaymentActionForbiddenException();
        }
    }

    public record ReviewRequest(String note, Long expectedVersion) {}
}
