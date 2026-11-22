package vn.ptit.soa.payment.security;

import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.ContractService;
import vn.ptit.soa.payment.dispute.DisputeReadNotFoundException;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments/contracts")
public class SecurePaymentContractController {
    private final ContractService contracts;
    private final ContractRepository repository;
    private final ChatConversationClient chat;

    public SecurePaymentContractController(ContractService contracts, ContractRepository repository,
            ChatConversationClient chat) {
        this.contracts = contracts;
        this.repository = repository;
        this.chat = chat;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Contract create(@RequestBody CreateRequest request, @AuthenticationPrincipal Jwt jwt) {
        if (!"TRADER".equals(jwt.getClaimAsString("role"))) {
            throw new PaymentActionForbiddenException();
        }
        chat.requireAcceptedRoom(request.conversationId(), request.offerId(), request.farmerId(),
                jwt.getSubject(), jwt.getTokenValue());
        return contracts.create(request.offerId(), request.conversationId(), request.farmerId(),
                jwt.getSubject(), request.totalAmount(), request.deliveryDate(), request.terms());
    }

    @PatchMapping("/{contractId}")
    public Contract updateDraft(@PathVariable String contractId,
            @RequestBody UpdateRequest request, @AuthenticationPrincipal Jwt jwt) {
        if (!"TRADER".equals(jwt.getClaimAsString("role"))) {
            throw new PaymentActionForbiddenException();
        }
        Contract existing = contract(contractId);
        if (!existing.traderId().equals(jwt.getSubject())) {
            throw new PaymentActionForbiddenException();
        }
        return contracts.updateDraft(contractId, jwt.getSubject(), request.totalAmount(),
                request.deliveryDate(), request.terms());
    }

    @PostMapping("/{contractId}/accept")
    public ContractService.AcceptResult accept(@PathVariable String contractId,
            @RequestBody(required = false) String body, @AuthenticationPrincipal Jwt jwt) {
        if (!"FARMER".equals(jwt.getClaimAsString("role"))) {
            throw new PaymentActionForbiddenException();
        }
        Contract existing = contract(contractId);
        if (!existing.farmerId().equals(jwt.getSubject())) {
            throw new PaymentActionForbiddenException();
        }
        return contracts.accept(contractId, jwt.getSubject());
    }

    private Contract contract(String id) {
        if (id == null) throw new IllegalArgumentException("ID must be a UUID.");
        try {
            String parsed = UUID.fromString(id).toString();
            if (!parsed.equalsIgnoreCase(id)) throw new IllegalArgumentException();
            return repository.findById(parsed).orElseThrow(DisputeReadNotFoundException::new);
        } catch (IllegalArgumentException invalid) {
            throw new DisputeReadNotFoundException();
        }
    }

    public record CreateRequest(String offerId, String conversationId, String farmerId,
            String totalAmount, String deliveryDate, String terms) {}

    public record UpdateRequest(String totalAmount, String deliveryDate, String terms) {}
}
