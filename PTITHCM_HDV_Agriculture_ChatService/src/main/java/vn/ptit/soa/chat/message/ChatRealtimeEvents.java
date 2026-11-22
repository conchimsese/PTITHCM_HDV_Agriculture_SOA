package vn.ptit.soa.chat.message;

import java.time.Instant;

public final class ChatRealtimeEvents {
    private ChatRealtimeEvents() {}

    public record MessageSent(ChatMessage message, String recipientId) {}

    public record MessageRead(String conversationId, String readerId,
            ChatMessageService.ReadResult result) {}

    public record ContractUpdated(String conversationId, String contractId, String status, Instant occurredAt, long stateVersion) {}
}
