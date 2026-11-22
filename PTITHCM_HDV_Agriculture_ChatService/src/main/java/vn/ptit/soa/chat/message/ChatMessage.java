package vn.ptit.soa.chat.message;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document("messages")
public record ChatMessage(
        @Id String messageId,
        @Field("conversation_id") String conversationId,
        @Field("sender_id") String senderId,
        @Field("message_type") String messageType,
        String content,
        @Field("attachment_url") String attachmentUrl,
        @Field("contract_id") String contractId,
        @Field("is_read") boolean isRead,
        @Field("created_at") Instant createdAt,
        @Field("read_at") Instant readAt) {
}
