package vn.ptit.soa.payment.dispute;

import java.util.List;

public record DisputeDecision(String decisionId, String disputeId, String adminId,
        long expectedVersion, String outcome, String depositDisposition, String reason,
        List<String> evidenceRefs) {}
