package vn.ptit.soa.chat.conversation;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;

class ChatAcceptedOfferConsumerTest {
    private static final String OFFER = "202fe3fd-626a-41c8-80fd-70af82c1f256";
    private static final String LISTING = "11111111-1111-4111-8111-111111111111";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";

    @Test
    void acceptedOfferOpensItsConversation() throws Exception {
        ConversationService service = mock(ConversationService.class);
        new ChatAcceptedOfferConsumer(new ObjectMapper(), service)
                .receive(record(OFFER, event("OFFER_ACCEPTED", TRADER)));
        verify(service).openForAcceptedOffer(OFFER, FARMER, TRADER);
    }

    @Test
    void createdOfferDoesNotOpenConversation() throws Exception {
        ConversationService service = mock(ConversationService.class);
        new ChatAcceptedOfferConsumer(new ObjectMapper(), service)
                .receive(record(OFFER, event("OFFER_CREATED", FARMER)));
        verifyNoInteractions(service);
    }

    @Test
    void mismatchedKeyOrRecipientCannotOpenConversation() {
        ConversationService service = mock(ConversationService.class);
        ChatAcceptedOfferConsumer consumer = new ChatAcceptedOfferConsumer(new ObjectMapper(), service);
        assertThrows(IllegalArgumentException.class,
                () -> consumer.receive(record(LISTING, event("OFFER_ACCEPTED", TRADER))));
        assertThrows(IllegalArgumentException.class,
                () -> consumer.receive(record(OFFER, event("OFFER_ACCEPTED", FARMER))));
        verifyNoInteractions(service);
    }

    private ConsumerRecord<String, String> record(String key, String value) {
        return new ConsumerRecord<>("soa.trading.offer.v1", 0, 0L, key, value);
    }

    private String event(String type, String recipient) {
        return """
                {"eventId":"33333333-3333-4333-8333-333333333333",
                 "eventType":"%s","eventVersion":1,"sourceService":"trading-service",
                 "occurredAt":"2026-10-19T00:00:00Z","recipientIds":["%s"],
                 "referenceType":"OFFER","referenceId":"%s",
                 "data":{"offerId":"%s","listingId":"%s","farmerId":"%s","traderId":"%s"}}
                """.formatted(type, recipient, OFFER, OFFER, LISTING, FARMER, TRADER);
    }
}
