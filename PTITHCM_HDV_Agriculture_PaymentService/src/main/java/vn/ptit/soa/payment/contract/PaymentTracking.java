package vn.ptit.soa.payment.contract;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentTracking(String paymentTrackingId, String contractId,
        BigDecimal depositRate,
        @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
        @io.swagger.v3.oas.annotations.media.Schema(type="string", implementation=String.class) BigDecimal depositAmount, String status,
        Instant paidAt, Instant deliveryDate, Instant completedConfirmedAt,
        Instant releaseAt, Instant releasedAt, boolean disputeHold,
        long stateVersion, Instant createdAt, Instant updatedAt) {
}
