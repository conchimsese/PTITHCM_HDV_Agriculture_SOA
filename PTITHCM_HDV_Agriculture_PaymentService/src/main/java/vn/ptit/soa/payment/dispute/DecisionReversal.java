package vn.ptit.soa.payment.dispute;

import java.time.Instant;
import java.util.List;

public record DecisionReversal(String reversalDecisionId, String originalDecisionId,
        String disputeId, String adminId, String reason, List<String> evidenceRefs,
        Instant createdAt) {}
