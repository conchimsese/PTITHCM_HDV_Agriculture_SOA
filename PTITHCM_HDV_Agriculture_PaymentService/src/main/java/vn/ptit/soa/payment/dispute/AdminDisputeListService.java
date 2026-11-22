package vn.ptit.soa.payment.dispute;

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
public class AdminDisputeListService {
    private static final Set<String> STATUSES = Set.of("OPEN", "UNDER_REVIEW", "RESOLVED");
    private final DisputeRepository disputes;

    public AdminDisputeListService(DisputeRepository disputes) {
        this.disputes = disputes;
    }

    // Learning-only: the production route must validate ADMIN and ACTIVE from JWT/access-state.
    public Page list(String adminId, String status, String cursor, Integer requestedLimit) {
        String admin = uuid(adminId);
        if (status != null && !STATUSES.contains(status)) {
            throw new IllegalArgumentException("Unknown dispute status.");
        }
        int limit = requestedLimit == null ? 20 : requestedLimit;
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("limit must be between 1 and 100.");
        }
        Cursor before = decode(cursor);
        List<Dispute> found = disputes.findForIndependentAdmin(admin, status,
                before == null ? null : before.createdAt(),
                before == null ? null : before.id(), limit + 1);
        boolean more = found.size() > limit;
        List<Dispute> items = List.copyOf(found.subList(0, Math.min(limit, found.size())));
        Dispute last = items.isEmpty() ? null : items.get(items.size() - 1);
        return new Page(items, more ? encode(last) : null);
    }

    private String encode(Dispute last) {
        String raw = last.createdAt() + "|" + last.disputeId();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private Cursor decode(String token) {
        if (token == null) return null;
        if (token.isBlank() || token.length() > 256) {
            throw new IllegalArgumentException("Invalid dispute cursor.");
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 2) throw new IllegalArgumentException();
            return new Cursor(Instant.parse(parts[0]), uuid(parts[1]));
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("Invalid dispute cursor.");
        }
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

    private record Cursor(Instant createdAt, String id) {}

    public record Page(List<Dispute> items, String nextCursor) {}
}
