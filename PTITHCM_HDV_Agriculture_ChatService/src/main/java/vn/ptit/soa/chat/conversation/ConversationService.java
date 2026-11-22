package vn.ptit.soa.chat.conversation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
@Profile("database-learning")
public class ConversationService {
    private final ConversationRepository repository;

    public ConversationService(ConversationRepository repository) {
        this.repository = repository;
    }

    // The real caller will be the verified OFFER_ACCEPTED Kafka consumer.
    public Conversation openForAcceptedOffer(String offerId, String farmerId, String traderId) {
        String offer = uuid(offerId);
        String farmer = uuid(farmerId);
        String trader = uuid(traderId);
        if (farmer.equals(trader)) {
            throw new IllegalArgumentException("Farmer and trader must be different accounts.");
        }
        return repository.findByOfferId(offer)
                .map(existing -> sameParticipants(existing, farmer, trader))
                .orElseGet(() -> create(offer, farmer, trader));
    }

    private Conversation create(String offer, String farmer, String trader) {
        Instant now = Instant.now();
        Conversation conversation = new Conversation(UUID.randomUUID().toString(),
                List.of(farmer, trader), offer, null, "ACTIVE", now, now);
        try {
            return repository.insert(conversation);
        } catch (DuplicateKeyException race) {
            // Kafka may redeliver while another worker is opening the same offer.
            return repository.findByOfferId(offer)
                    .map(existing -> sameParticipants(existing, farmer, trader))
                    .orElseThrow(() -> race);
        }
    }

    private Conversation sameParticipants(Conversation conversation, String farmer, String trader) {
        if (!conversation.participantIds().equals(List.of(farmer, trader))) {
            throw new IllegalArgumentException("This offerId already belongs to different participants.");
        }
        return conversation;
    }

    private String uuid(String value) {
        if (value == null) throw new IllegalArgumentException("All IDs must be UUIDs.");
        try {
            UUID parsed = UUID.fromString(value);
            if (!parsed.toString().equalsIgnoreCase(value)) throw new IllegalArgumentException();
            return parsed.toString();
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("All IDs must be UUIDs.");
        }
    }
}
