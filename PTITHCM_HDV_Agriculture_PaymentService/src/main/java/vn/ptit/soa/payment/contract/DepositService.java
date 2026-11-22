package vn.ptit.soa.payment.contract;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("database-learning")
public class DepositService {
    private static final Set<String> STATUSES = Set.of("PENDING", "LOCKED", "RELEASABLE",
            "RELEASED", "FORFEITED", "REFUNDED");
    private final ContractRepository contracts;
    private final PaymentTrackingRepository tracking;
    private final TradingDepositClient trading;
    private final DepositFinalizer finalizer;

    public DepositService(ContractRepository contracts, PaymentTrackingRepository tracking,
            TradingDepositClient trading, DepositFinalizer finalizer) {
        this.contracts = contracts;
        this.tracking = tracking;
        this.trading = trading;
        this.finalizer = finalizer;
    }

    // Learning-only: a production endpoint must derive traderId from a verified JWT.
    public DepositFinalizer.PayResult pay(String contractId, String traderId) {
        String id = uuid(contractId);
        String actor = uuid(traderId);
        Contract contract = contracts.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Contract does not exist."));
        if (!contract.traderId().equals(actor)) {
            throw new IllegalArgumentException("Only this Contract's trader can pay its deposit.");
        }
        PaymentTracking deposit = tracking.findByContractId(id)
                .orElseThrow(() -> new IllegalStateException("Contract has no deposit tracking."));
        if ("ACTIVE".equals(contract.status()) && "LOCKED".equals(deposit.status())) {
            return finalizer.finish(id, actor, deposit.paymentTrackingId());
        }
        if (!"PENDING_DEPOSIT".equals(contract.status()) || !"PENDING".equals(deposit.status())) {
            throw new IllegalStateException("Contract is not awaiting a deposit.");
        }
        trading.commit(contract, deposit);
        return finalizer.finish(id, actor, deposit.paymentTrackingId());
    }

    public PaymentTracking find(String contractId, String actorId) {
        String id = uuid(contractId);
        String actor = uuid(actorId);
        Contract contract = contracts.findById(id)
                .orElseThrow(DepositNotFoundException::new);
        if (!actor.equals(contract.farmerId()) && !actor.equals(contract.traderId())) {
            throw new DepositNotFoundException();
        }
        return tracking.findByContractId(id)
                .orElseThrow(DepositNotFoundException::new);
    }

    public DepositPage list(String actorId, String status, String cursor, Integer requestedLimit) {
        String actor = uuid(actorId);
        if (status != null && !STATUSES.contains(status)) {
            throw new IllegalArgumentException("Unknown deposit status.");
        }
        int limit = requestedLimit == null ? 20 : requestedLimit;
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("limit must be between 1 and 100.");
        }
        Cursor before = decode(cursor);
        List<PaymentTracking> found = tracking.findForParticipant(actor, status,
                before == null ? null : before.createdAt(),
                before == null ? null : before.id(), limit + 1);
        boolean more = found.size() > limit;
        List<PaymentTracking> data = List.copyOf(found.subList(0, Math.min(limit, found.size())));
        PaymentTracking last = data.isEmpty() ? null : data.get(data.size() - 1);
        return new DepositPage(data, more ? encode(last) : null);
    }

    private String encode(PaymentTracking last) {
        String raw = last.createdAt() + "|" + last.paymentTrackingId();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private Cursor decode(String token) {
        if (token == null) return null;
        if (token.isBlank() || token.length() > 256) {
            throw new IllegalArgumentException("Invalid deposit cursor.");
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 2) throw new IllegalArgumentException();
            return new Cursor(Instant.parse(parts[0]), uuid(parts[1]));
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("Invalid deposit cursor.");
        }
    }

    private record Cursor(Instant createdAt, String id) {}

    public record DepositPage(List<PaymentTracking> data, String nextCursor) {}

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
