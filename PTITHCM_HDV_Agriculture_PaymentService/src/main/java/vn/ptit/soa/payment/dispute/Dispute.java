package vn.ptit.soa.payment.dispute;

import java.time.Instant;

public record Dispute(String disputeId, String contractId, String openedBy,
        String reasonCode, String description, String status, boolean depositHold,
        String assignedAdminId, Instant responseDueAt, Instant resolvedAt, String outcome,
        long stateVersion, long decisionVersion, Instant createdAt, Instant updatedAt) {}
