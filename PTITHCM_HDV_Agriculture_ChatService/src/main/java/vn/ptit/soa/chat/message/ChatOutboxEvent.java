package vn.ptit.soa.chat.message;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document("outbox_events")
public record ChatOutboxEvent(@Id String eventId, String eventType, int eventVersion,
        String sourceService, Instant occurredAt, String actorId, List<String> recipientIds,
        String referenceType, String referenceId, String topic, String eventKey,
        Map<String, String> data, @Field("published_at") Instant publishedAt,
        @Field("claimed_by") String claimedBy, @Field("lease_until") Instant leaseUntil,
        @Field("attempt_count") int attemptCount) {}
