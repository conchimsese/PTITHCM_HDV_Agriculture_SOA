package vn.ptit.soa.payment.dispute;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.PaymentTracking;
import vn.ptit.soa.payment.contract.PaymentTrackingRepository;

@Service
@Profile("database-learning")
public class AdminDisputeFilingService {
    private final ContractRepository contracts;
    private final PaymentTrackingRepository tracking;
    private final DisputeRepository disputes;
    private final AdminDisputeFilingRepository filings;
    private final Clock clock;

    public AdminDisputeFilingService(ContractRepository contracts,
            PaymentTrackingRepository tracking, DisputeRepository disputes,
            AdminDisputeFilingRepository filings, Clock clock) {
        this.contracts = contracts;
        this.tracking = tracking;
        this.disputes = disputes;
        this.filings = filings;
        this.clock = clock;
    }

    // The caller authenticates Admin; an operator must verify identity outside this service.
    @Transactional
    public Dispute open(String contractId, String adminId, String onBehalfOfAccountId,
            String reasonCode, String description, String verificationNote) {
        String id = uuid(contractId);
        String admin = uuid(adminId);
        String participant = uuid(onBehalfOfAccountId);
        String reason = required(reasonCode, "reasonCode", 80);
        String details = required(description, "description", 5000);
        String verification = required(verificationNote, "verificationNote", 5000);
        Contract contract = contracts.findByIdForUpdate(id)
                .orElseThrow(DisputeReadNotFoundException::new);
        if (!participant.equals(contract.farmerId()) && !participant.equals(contract.traderId())) {
            throw new IllegalArgumentException("The represented account must participate in this Contract.");
        }
        if (admin.equals(contract.farmerId()) || admin.equals(contract.traderId())) {
            throw new IllegalArgumentException("Admin cannot file for their own Contract.");
        }
        PaymentTracking deposit = tracking.findByContractIdForUpdate(id)
                .orElseThrow(() -> new IllegalStateException("Contract has no deposit tracking."));
        if (!("ACTIVE".equals(contract.status()) || "COMPLETED".equals(contract.status()))) {
            throw new IllegalStateException("Contract cannot be disputed in its current state.");
        }
        if (disputes.activeExists(id)) {
            throw new IllegalStateException("Contract already has an active dispute.");
        }
        boolean hold = "LOCKED".equals(deposit.status()) || "RELEASABLE".equals(deposit.status());
        Instant now = clock.instant();
        if (hold) tracking.setDisputeHold(id, true, now);
        Dispute dispute = new Dispute(UUID.randomUUID().toString(), id, participant,
                reason, details, "OPEN", hold, null, null, null, null,
                1, 0, now, now);
        disputes.insert(dispute);
        filings.insert(dispute.disputeId(), admin, participant, verification, now);
        return dispute;
    }

    private String required(String value, String field, int maxLength) {
        if (value == null || value.isBlank() || value.length() > maxLength) {
            throw new IllegalArgumentException(field + " must be nonblank and at most "
                    + maxLength + " characters.");
        }
        return value.trim();
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
}
