package vn.ptit.soa.payment.dispute;

import java.time.Instant;
import java.util.List;

public record DisputeResponse(String responseId, String disputeId, String accountId,
        String statement, List<String> evidenceRefs, Instant createdAt) {}
