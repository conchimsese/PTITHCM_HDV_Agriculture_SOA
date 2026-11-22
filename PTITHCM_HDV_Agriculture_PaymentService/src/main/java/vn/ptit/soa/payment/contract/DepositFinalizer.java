package vn.ptit.soa.payment.contract;

import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("database-learning")
public class DepositFinalizer {
    private final ContractRepository contracts;
    private final PaymentTrackingRepository tracking;
    private final ContractOutboxRepository contractOutbox;
    private final DepositOutboxRepository depositOutbox;

    public DepositFinalizer(ContractRepository contracts, PaymentTrackingRepository tracking,
            ContractOutboxRepository contractOutbox, DepositOutboxRepository depositOutbox) {
        this.contracts = contracts;
        this.tracking = tracking;
        this.contractOutbox = contractOutbox;
        this.depositOutbox = depositOutbox;
    }

    @Transactional
    public PayResult finish(String contractId, String traderId, String expectedTrackingId) {
        Contract contract = contracts.findByIdForUpdate(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract does not exist."));
        if (!contract.traderId().equals(traderId)) {
            throw new IllegalArgumentException("Only this Contract's trader can pay its deposit.");
        }
        PaymentTracking deposit = tracking.findByContractIdForUpdate(contractId)
                .orElseThrow(() -> new IllegalStateException("Contract has no deposit tracking."));
        if (!deposit.paymentTrackingId().equals(expectedTrackingId)) {
            throw new IllegalStateException("Deposit tracking changed during claim.");
        }
        if ("ACTIVE".equals(contract.status()) && "LOCKED".equals(deposit.status())) {
            return result(contract, deposit);
        }
        if (!"PENDING_DEPOSIT".equals(contract.status()) || !"PENDING".equals(deposit.status())) {
            throw new IllegalStateException("Contract is not awaiting a deposit.");
        }
        Instant now = Instant.now();
        contracts.markActive(contractId, contract.stateVersion() + 1, now);
        tracking.markLocked(contractId, deposit.stateVersion() + 1, now);
        Contract active = contracts.findById(contractId).orElseThrow();
        PaymentTracking locked = tracking.findByContractId(contractId).orElseThrow();
        contractOutbox.statusChanged(active, "PENDING_DEPOSIT", traderId, now);
        depositOutbox.paid(active, locked, now);
        depositOutbox.statusChanged(active, locked, "PENDING", traderId, now);
        return result(active, locked);
    }

    private PayResult result(Contract contract, PaymentTracking deposit) {
        return new PayResult(deposit.paymentTrackingId(), contract.contractId(),
                deposit.depositAmount(), deposit.status(), contract.status(), true);
    }

    public record PayResult(String paymentTrackingId, String contractId, @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) @io.swagger.v3.oas.annotations.media.Schema(type="string", implementation=String.class) BigDecimal depositAmount,
            String status, String contractStatus, boolean simulated) {}
}
