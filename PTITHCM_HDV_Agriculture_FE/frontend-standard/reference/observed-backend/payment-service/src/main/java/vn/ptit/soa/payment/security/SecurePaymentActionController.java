package vn.ptit.soa.payment.security;

import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.DepositFinalizer;
import vn.ptit.soa.payment.contract.DepositLifecycleService;
import vn.ptit.soa.payment.contract.DepositService;
import vn.ptit.soa.payment.dispute.DisputeReadNotFoundException;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments")
public class SecurePaymentActionController {
    private final ContractRepository contracts;
    private final DepositLifecycleService lifecycle;
    private final DepositService deposits;

    public SecurePaymentActionController(ContractRepository contracts,
            DepositLifecycleService lifecycle, DepositService deposits) {
        this.contracts = contracts;
        this.lifecycle = lifecycle;
        this.deposits = deposits;
    }

    @PostMapping("/deposits/{contractId}/pay")
    public DepositFinalizer.PayResult pay(@PathVariable String contractId,
            @RequestBody(required = false) String body, @AuthenticationPrincipal Jwt jwt) {
        requireEmptyBody(body);
        Contract contract = contract(contractId);
        if (!"TRADER".equals(jwt.getClaimAsString("role"))
                || !contract.traderId().equals(jwt.getSubject())) {
            throw new PaymentActionForbiddenException();
        }
        return deposits.pay(contract.contractId(), jwt.getSubject());
    }

    @PostMapping("/contracts/{contractId}/complete")
    public CompleteView complete(@PathVariable String contractId,
            @RequestBody(required = false) String body, @AuthenticationPrincipal Jwt jwt) {
        requireEmptyBody(body);
        Contract contract = contract(contractId);
        if (!"TRADER".equals(jwt.getClaimAsString("role"))
                || !contract.traderId().equals(jwt.getSubject())) {
            throw new PaymentActionForbiddenException();
        }
        DepositLifecycleService.CompleteResult result = lifecycle.complete(contract.contractId(), jwt.getSubject());
        return new CompleteView(result.contractId(), result.status(),
                result.paymentTrackingId(), result.depositStatus());
    }

    @PostMapping("/deposits/{contractId}/release")
    public DepositLifecycleService.ReleaseResult release(@PathVariable String contractId,
            @RequestBody(required = false) String body, @AuthenticationPrincipal Jwt jwt) {
        requireEmptyBody(body);
        Contract contract = contract(contractId);
        if (!"FARMER".equals(jwt.getClaimAsString("role"))
                || !contract.farmerId().equals(jwt.getSubject())) {
            throw new PaymentActionForbiddenException();
        }
        return lifecycle.release(contract.contractId(), jwt.getSubject());
    }

    private Contract contract(String id) {
        if (id == null) throw new IllegalArgumentException("ID must be a UUID.");
        try {
            String parsed = UUID.fromString(id).toString();
            if (!parsed.equalsIgnoreCase(id)) throw new IllegalArgumentException();
            return contracts.findById(parsed).orElseThrow(DisputeReadNotFoundException::new);
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("ID must be a UUID.");
        }
    }

    private void requireEmptyBody(String body) {
        if (body != null && !body.isBlank() && !"{}".equals(body.trim())) {
            throw new IllegalArgumentException("Request body must be empty.");
        }
    }

    public record CompleteView(String contractId, String status,
            String paymentTrackingId, String depositStatus) {}
}
