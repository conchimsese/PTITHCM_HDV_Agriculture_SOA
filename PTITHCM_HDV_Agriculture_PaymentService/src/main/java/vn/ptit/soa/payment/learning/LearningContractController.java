package vn.ptit.soa.payment.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractService;
import vn.ptit.soa.payment.contract.DepositLifecycleService;
import vn.ptit.soa.payment.dispute.DisputeReadService;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@Profile("learning & database-learning")
@RequestMapping("/learning/contracts")
public class LearningContractController {
    private final ContractService contracts;
    private final DepositLifecycleService lifecycle;
    private final DisputeReadService reads;

    public LearningContractController(ContractService contracts, DepositLifecycleService lifecycle,
            DisputeReadService reads) {
        this.contracts = contracts;
        this.lifecycle = lifecycle;
        this.reads = reads;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Contract create(@RequestBody CreateContractRequest request) {
        return contracts.create(request.offerId(), request.conversationId(), request.farmerId(),
                request.traderId(), request.totalAmount(), request.deliveryDate(), request.terms());
    }

    @GetMapping("/{contractId}")
    public DisputeReadService.ContractDetail find(@PathVariable String contractId,
            @RequestParam String actorId) {
        return reads.contract(contractId, actorId);
    }

    public record CreateContractRequest(String offerId, String conversationId,
            String farmerId, String traderId, String totalAmount,
            String deliveryDate, String terms) {}

    @PatchMapping("/{contractId}")
    public Contract updateDraft(@PathVariable String contractId,
            @RequestBody UpdateContractRequest request) {
        return contracts.updateDraft(contractId, request.traderId(), request.totalAmount(),
                request.deliveryDate(), request.terms());
    }

    @PostMapping("/{contractId}/accept")
    public ContractService.AcceptResult accept(@PathVariable String contractId,
            @RequestBody AcceptContractRequest request) {
        return contracts.accept(contractId, request.farmerId());
    }

    public record UpdateContractRequest(String traderId, String totalAmount,
            String deliveryDate, String terms) {}

    public record AcceptContractRequest(String farmerId) {}

    @PostMapping("/{contractId}/complete")
    public DepositLifecycleService.CompleteResult complete(@PathVariable String contractId,
            @RequestBody CompleteContractRequest request) {
        return lifecycle.complete(contractId, request.traderId());
    }

    public record CompleteContractRequest(String traderId) {}
}
