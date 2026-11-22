package vn.ptit.soa.chat.contract;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ptit.soa.chat.conversation.Conversation;
import vn.ptit.soa.chat.conversation.ConversationRepository;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageRepository;
import vn.ptit.soa.chat.message.ChatRealtimeEvents;

@Service
@Profile("database-learning")
public class ChatContractService {
    private final ConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final ApplicationEventPublisher events;

    public ChatContractService(ConversationRepository conversations, ChatMessageRepository messages,
            ApplicationEventPublisher events) {
        this.conversations = conversations;
        this.messages = messages;
        this.events = events;
    }

    @Transactional
    public void contractCreated(String contractId, String offerId, String farmerId, String traderId, Instant occurredAt) {
        String contract = uuid(contractId);
        Conversation room = conversations.findByOfferId(uuid(offerId))
                .orElseThrow(() -> new IllegalStateException("Accepted-offer conversation is not available yet."));
        checkParticipants(room, uuid(farmerId), uuid(traderId));
        if (room.contractId() != null && !room.contractId().equals(contract)) {
            throw new IllegalStateException("Offer conversation is already linked to another contract.");
        }
        if (room.contractId() == null && !conversations.linkContract(room.conversationId(), contract, Instant.now())) {
            Conversation refreshed = conversations.findById(room.conversationId()).orElseThrow();
            if (!contract.equals(refreshed.contractId())) {
                throw new IllegalStateException("Concurrent contract link conflict.");
            }
        }
        // Stable UUID makes redelivery idempotent, including a crash after Mongo commit but before Kafka offset commit.
        String cardId = UUID.nameUUIDFromBytes(("CONTRACT:" + contract).getBytes(StandardCharsets.UTF_8)).toString();
        if (messages.findById(cardId).isEmpty()) {
            ChatMessage card = new ChatMessage(cardId, room.conversationId(), uuid(traderId),
                    "CONTRACT", null, null, contract, true, occurredAt, occurredAt);
            messages.insert(card);
            events.publishEvent(new ChatRealtimeEvents.MessageSent(card, uuid(farmerId)));
        }
    }

    @Transactional
    public void contractStatusChanged(String contractId, String status, String farmerId, String traderId, Instant occurredAt, long stateVersion) {
        if (stateVersion < 1) throw new IllegalArgumentException("Invalid Contract stateVersion.");
        Conversation room = conversations.findByContractId(uuid(contractId))
                .orElseThrow(() -> new IllegalStateException("Contract card is not linked yet."));
        checkParticipants(room, uuid(farmerId), uuid(traderId));
        if (conversations.advanceContractVersion(room.conversationId(), uuid(contractId), stateVersion, status)) {
            events.publishEvent(new ChatRealtimeEvents.ContractUpdated(room.conversationId(), uuid(contractId), status, occurredAt, stateVersion));
        }
    }

    private void checkParticipants(Conversation room, String farmer, String trader) {
        List<String> participants = room.participantIds();
        if (farmer.equals(trader) || participants == null || participants.size() != 2
                || !Set.copyOf(participants).equals(Set.of(farmer, trader))) {
            throw new IllegalStateException("Contract participants do not match the conversation.");
        }
    }

    private String uuid(String value) {
        if (value == null) throw new IllegalArgumentException("Missing UUID.");
        UUID parsed = UUID.fromString(value);
        if (!parsed.toString().equalsIgnoreCase(value)) throw new IllegalArgumentException("Invalid UUID.");
        return parsed.toString();
    }
}
