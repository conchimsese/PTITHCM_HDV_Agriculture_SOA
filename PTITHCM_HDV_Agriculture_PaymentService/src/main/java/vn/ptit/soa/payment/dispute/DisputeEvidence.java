package vn.ptit.soa.payment.dispute;

import java.time.Instant;

public record DisputeEvidence(String evidenceId, String disputeId, String uploaderId,
        String sourceAccountId,
        String storageKey, String contentType, long sizeBytes, String sha256,
        String description, Instant createdAt, Instant attachedAt) {}
