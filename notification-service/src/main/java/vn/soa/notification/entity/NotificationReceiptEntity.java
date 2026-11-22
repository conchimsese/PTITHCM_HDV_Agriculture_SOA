package vn.soa.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "notification_receipts")
public class NotificationReceiptEntity {

    @EmbeddedId
    private NotificationReceiptId id;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    @Column(name = "payload_hash", nullable = false, length = 64, columnDefinition = "bpchar")
    private String payloadHash;

    public NotificationReceiptEntity() {
    }

    public NotificationReceiptEntity(NotificationReceiptId id, Instant processedAt, String payloadHash) {
        this.id = id;
        this.processedAt = processedAt;
        this.payloadHash = payloadHash;
    }

    public NotificationReceiptId getId() {
        return id;
    }

    public void setId(NotificationReceiptId id) {
        this.id = id;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }

    public void setProcessedAt(Instant processedAt) {
        this.processedAt = processedAt;
    }

    public String getPayloadHash() {
        return payloadHash;
    }

    public void setPayloadHash(String payloadHash) {
        this.payloadHash = payloadHash;
    }
}
