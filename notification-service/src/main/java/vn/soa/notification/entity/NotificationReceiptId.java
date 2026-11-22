package vn.soa.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class NotificationReceiptId implements Serializable {

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    public NotificationReceiptId() {
    }

    public NotificationReceiptId(UUID eventId, UUID recipientId) {
        this.eventId = eventId;
        this.recipientId = recipientId;
    }

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public UUID getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(UUID recipientId) {
        this.recipientId = recipientId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        NotificationReceiptId that = (NotificationReceiptId) o;
        return Objects.equals(eventId, that.eventId) && Objects.equals(recipientId, that.recipientId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(eventId, recipientId);
    }
}
