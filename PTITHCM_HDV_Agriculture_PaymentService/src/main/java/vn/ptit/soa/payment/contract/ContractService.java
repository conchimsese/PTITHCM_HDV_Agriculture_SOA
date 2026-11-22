package vn.ptit.soa.payment.contract;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("database-learning")
public class ContractService {
    private final ContractRepository contracts;
    private final PaymentTrackingRepository tracking;
    private final ContractOutboxRepository outbox;

    public ContractService(ContractRepository contracts, PaymentTrackingRepository tracking,
            ContractOutboxRepository outbox) {
        this.contracts = contracts;
        this.tracking = tracking;
        this.outbox = outbox;
    }

    // Learning-only: production must derive trader from JWT and verify Offer/Chat.
    @Transactional
    public Contract create(String offerId, String conversationId, String farmerId,
            String traderId, String totalAmount, String deliveryDate, String terms) {
        String offer = uuid(offerId);
        String conversation = uuid(conversationId);
        String farmer = uuid(farmerId);
        String trader = uuid(traderId);
        if (farmer.equals(trader)) {
            throw new IllegalArgumentException("Farmer and trader must be different accounts.");
        }
        if (totalAmount == null || !totalAmount.matches("[0-9]{1,13}\\.[0-9]{2}")) {
            throw new IllegalArgumentException("totalAmount must have two decimal places, e.g. 92000000.00.");
        }
        BigDecimal amount = new BigDecimal(totalAmount);
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("totalAmount must be positive.");
        }
        Instant delivery;
        try {
            delivery = Instant.parse(deliveryDate);
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("deliveryDate must be UTC ISO-8601, e.g. 2026-10-18T00:00:00Z.");
        }
        if (!delivery.isAfter(Instant.now())) {
            throw new IllegalArgumentException("deliveryDate must be in the future.");
        }
        if (terms == null || terms.isBlank()) {
            throw new IllegalArgumentException("terms must not be blank.");
        }
        Instant now = Instant.now();
        Contract contract = new Contract(UUID.randomUUID().toString(), offer, conversation,
                farmer, trader, amount, terms, delivery, "CREATED", new BigDecimal("20.00"),
                null, 1L, now, now);
        contracts.requireUnusedConversation(conversation);
        contracts.insert(contract);
        outbox.created(contract, now);
        return contract;
    }

    @Transactional
    public Contract updateDraft(String id, String traderId, String totalAmount,
            String deliveryDate, String terms) {
        Contract current = contracts.findByIdForUpdate(uuid(id))
                .orElseThrow(() -> new IllegalArgumentException("Contract does not exist."));
        if (!current.traderId().equals(uuid(traderId))) {
            throw new IllegalArgumentException("Only this Contract's trader can edit it.");
        }
        if (!"CREATED".equals(current.status())) {
            throw new IllegalStateException("Only a CREATED Contract can be edited.");
        }
        if (totalAmount == null && deliveryDate == null && terms == null) {
            throw new IllegalArgumentException("Provide at least one term to change.");
        }
        BigDecimal amount = totalAmount == null ? current.totalAmount() : amount(totalAmount);
        Instant delivery = deliveryDate == null ? current.deliveryDate() : delivery(deliveryDate);
        String agreedTerms = terms == null ? current.terms() : terms(terms);
        Instant now = Instant.now();
        Contract updated = new Contract(current.contractId(), current.offerId(),
                current.conversationId(), current.farmerId(), current.traderId(),
                amount, agreedTerms, delivery, current.status(), current.penaltyRate(),
                current.completedConfirmedAt(), current.stateVersion() + 1,
                current.createdAt(), now);
        contracts.updateDraft(updated);
        return updated;
    }

    @Transactional
    public AcceptResult accept(String id, String farmerId) {
        Contract current = contracts.findByIdForUpdate(uuid(id))
                .orElseThrow(() -> new IllegalArgumentException("Contract does not exist."));
        String farmer = uuid(farmerId);
        if (!current.farmerId().equals(farmer)) {
            throw new IllegalArgumentException("Only this Contract's farmer can accept it.");
        }
        if ("CREATED".equals(current.status())) {
            BigDecimal deposit = current.totalAmount().multiply(new BigDecimal("0.05"))
                    .setScale(0, RoundingMode.HALF_UP).setScale(2);
            if (deposit.signum() == 0) {
                throw new IllegalArgumentException("The Contract amount is too small for a 5% deposit.");
            }
            Instant now = Instant.now();
            PaymentTracking newTracking = new PaymentTracking(UUID.randomUUID().toString(),
                    current.contractId(), new BigDecimal("5.00"), deposit, "PENDING",
                    null, current.deliveryDate(), null, null, null, false, 1, now, now);
            contracts.markPendingDeposit(current.contractId(), current.stateVersion() + 1, now);
            tracking.insert(newTracking);
            Contract accepted = contracts.findById(current.contractId()).orElseThrow();
            outbox.statusChanged(accepted, "CREATED", farmer, now);
            return new AcceptResult(accepted.contractId(), accepted.status(),
                    newTracking.paymentTrackingId(), newTracking.depositRate(),
                    newTracking.depositAmount(), newTracking.status());
        }
        if ("CANCELLED".equals(current.status())) {
            throw new IllegalStateException("A cancelled Contract cannot be accepted.");
        }
        PaymentTracking existing = tracking.findByContractId(current.contractId()).orElseThrow();
        return new AcceptResult(current.contractId(), current.status(),
                existing.paymentTrackingId(), existing.depositRate(), existing.depositAmount(),
                existing.status());
    }

    public record AcceptResult(String contractId, String status, String paymentTrackingId,
            BigDecimal depositRate, @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) @io.swagger.v3.oas.annotations.media.Schema(type="string", implementation=String.class) BigDecimal depositAmount, String depositStatus) {}

    public Contract find(String id) {
        return contracts.findById(uuid(id))
                .orElseThrow(() -> new IllegalArgumentException("Contract does not exist."));
    }

    private String uuid(String value) {
        if (value == null) throw new IllegalArgumentException("ID must be a UUID.");
        try {
            UUID parsed = UUID.fromString(value);
            if (!parsed.toString().equalsIgnoreCase(value)) throw new IllegalArgumentException();
            return parsed.toString();
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("ID must be a UUID.");
        }
    }

    private BigDecimal amount(String value) {
        if (value == null || !value.matches("[0-9]{1,13}\\.[0-9]{2}")) {
            throw new IllegalArgumentException("totalAmount must have two decimal places, e.g. 92000000.00.");
        }
        BigDecimal parsed = new BigDecimal(value);
        if (parsed.signum() <= 0) throw new IllegalArgumentException("totalAmount must be positive.");
        return parsed;
    }

    private Instant delivery(String value) {
        Instant parsed;
        try {
            parsed = Instant.parse(value);
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("deliveryDate must be UTC ISO-8601.");
        }
        if (!parsed.isAfter(Instant.now())) {
            throw new IllegalArgumentException("deliveryDate must be in the future.");
        }
        return parsed;
    }

    private String terms(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("terms must not be blank.");
        }
        return value;
    }
}
