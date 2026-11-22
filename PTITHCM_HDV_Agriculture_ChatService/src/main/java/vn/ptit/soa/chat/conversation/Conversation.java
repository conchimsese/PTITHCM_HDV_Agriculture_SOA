package vn.ptit.soa.chat.conversation;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document("conversations")
public record Conversation(
        @Id String conversationId,
        @Field("participant_ids") List<String> participantIds,
        @Field("offer_id") String offerId,
        @Field("contract_id") String contractId,
        String status,
        @Field("created_at") Instant createdAt,
        @Field("updated_at") Instant updatedAt) {
}
