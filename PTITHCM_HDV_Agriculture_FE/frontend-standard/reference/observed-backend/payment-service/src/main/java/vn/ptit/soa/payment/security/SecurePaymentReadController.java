package vn.ptit.soa.payment.security;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.contract.DepositService;
import vn.ptit.soa.payment.contract.PaymentTracking;
import vn.ptit.soa.payment.dispute.DisputeReadService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments")
public class SecurePaymentReadController {
    private final DisputeReadService reads;
    private final DepositService deposits;

    public SecurePaymentReadController(DisputeReadService reads, DepositService deposits) {
        this.reads = reads;
        this.deposits = deposits;
    }

    @GetMapping("/contracts/{contractId}")
    public DisputeReadService.ContractDetail contract(@PathVariable String contractId,
            @AuthenticationPrincipal Jwt jwt) {
        return reads.contract(contractId, jwt.getSubject());
    }

    @GetMapping("/deposits/{contractId}")
    public DepositView deposit(@PathVariable String contractId, @AuthenticationPrincipal Jwt jwt) {
        PaymentTracking tracking = deposits.find(contractId, jwt.getSubject());
        return new DepositView(tracking.paymentTrackingId(), tracking.contractId(),
                tracking.depositRate(), tracking.depositAmount(), tracking.status(),
                tracking.paidAt(), tracking.deliveryDate(), tracking.releaseAt(), tracking.releasedAt());
    }

    @GetMapping("/deposits")
    public DepositPage deposits(@RequestParam(required = false) String status,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal Jwt jwt) {
        DepositService.DepositPage page = deposits.list(jwt.getSubject(), status, cursor, limit);
        List<DepositView> data = page.data().stream().map(tracking ->
                new DepositView(tracking.paymentTrackingId(), tracking.contractId(),
                        tracking.depositRate(), tracking.depositAmount(), tracking.status(),
                        tracking.paidAt(), tracking.deliveryDate(), tracking.releaseAt(),
                        tracking.releasedAt())).toList();
        return new DepositPage(data, page.nextCursor());
    }

    public record DepositView(String paymentTrackingId, String contractId,
            BigDecimal depositRate, @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) @io.swagger.v3.oas.annotations.media.Schema(type="string", implementation=String.class) BigDecimal depositAmount, String status,
            Instant paidAt, Instant deliveryDate, Instant releaseAt, Instant releasedAt) {}

    public record DepositPage(List<DepositView> data, String nextCursor) {}
}
