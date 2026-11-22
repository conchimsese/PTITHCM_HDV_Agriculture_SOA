package vn.ptit.soa.payment.security;

import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.dispute.Dispute;
import vn.ptit.soa.payment.dispute.DisputeReadNotFoundException;
import vn.ptit.soa.payment.dispute.DisputeReadService;
import vn.ptit.soa.payment.dispute.DisputeRepository;
import vn.ptit.soa.payment.dispute.DisputeResponse;
import vn.ptit.soa.payment.dispute.DisputeResponseService;
import vn.ptit.soa.payment.dispute.DisputeService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments")
public class SecurePaymentDisputeController {
    private final ContractRepository contracts;
    private final DisputeRepository disputes;
    private final DisputeService service;
    private final DisputeReadService reads;
    private final DisputeResponseService responses;

    public SecurePaymentDisputeController(ContractRepository contracts, DisputeRepository disputes,
            DisputeService service, DisputeReadService reads, DisputeResponseService responses) {
        this.contracts = contracts;
        this.disputes = disputes;
        this.service = service;
        this.reads = reads;
        this.responses = responses;
    }

    @PostMapping("/contracts/{contractId}/disputes")
    @ResponseStatus(HttpStatus.CREATED)
    public OpenView open(@PathVariable String contractId, @RequestBody OpenRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Contract contract = contracts.findById(uuid(contractId))
                .orElseThrow(DisputeReadNotFoundException::new);
        if (!participantWithRole(contract, jwt)) throw new PaymentActionForbiddenException();
        Dispute opened = service.open(contract.contractId(), jwt.getSubject(),
                request.reasonCode(), request.description(), request.evidenceRefs());
        return new OpenView(opened.disputeId(), opened.contractId(), opened.status(), opened.depositHold());
    }

    @GetMapping("/disputes/{disputeId}")
    public DisputeReadService.DisputeDetail find(@PathVariable String disputeId,
            @AuthenticationPrincipal Jwt jwt) {
        return reads.dispute(disputeId, jwt.getSubject(),
                "ADMIN".equals(jwt.getClaimAsString("role")));
    }

    @PostMapping("/disputes/{disputeId}/responses")
    @ResponseStatus(HttpStatus.CREATED)
    public DisputeResponse respond(@PathVariable String disputeId,
            @RequestBody ResponseRequest request, @AuthenticationPrincipal Jwt jwt) {
        Dispute dispute = disputes.findById(uuid(disputeId))
                .orElseThrow(DisputeReadNotFoundException::new);
        Contract contract = contracts.findById(dispute.contractId())
                .orElseThrow(DisputeReadNotFoundException::new);
        if (!participantWithRole(contract, jwt)) throw new DisputeReadNotFoundException();
        return responses.respond(dispute.disputeId(), jwt.getSubject(),
                request.statement(), request.evidenceRefs());
    }

    private boolean participantWithRole(Contract contract, Jwt jwt) {
        String role = jwt.getClaimAsString("role");
        return "FARMER".equals(role) && contract.farmerId().equals(jwt.getSubject())
                || "TRADER".equals(role) && contract.traderId().equals(jwt.getSubject());
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

    public record OpenRequest(String reasonCode, String description, List<String> evidenceRefs) {}
    public record OpenView(String disputeId, String contractId, String status, boolean depositHold) {}
    public record ResponseRequest(String statement, List<String> evidenceRefs) {}
}
