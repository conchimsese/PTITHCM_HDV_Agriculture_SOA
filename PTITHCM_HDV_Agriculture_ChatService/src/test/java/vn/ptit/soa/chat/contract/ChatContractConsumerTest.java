package vn.ptit.soa.chat.contract;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;

class ChatContractConsumerTest {
    private static final String CONTRACT = "202fe3fd-626a-41c8-80fd-70af82c1f257";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";

    @Test
    void statusChangeChecksVersionAndDelegatesWithoutCreatingCard() throws Exception {
        ChatContractService service = mock(ChatContractService.class);
        ChatContractConsumer consumer = new ChatContractConsumer(new ObjectMapper(), service);
        consumer.receive(record(CONTRACT, """
                {"eventType":"CONTRACT_STATUS_CHANGED","eventVersion":1,"sourceService":"payment-service",
                 "referenceType":"CONTRACT","referenceId":"%s",
                 "occurredAt":"2026-10-27T00:00:00Z",
                 "data":{"contractId":"%s","farmerId":"%s","traderId":"%s",
                         "previousStatus":"CREATED","status":"PENDING_DEPOSIT","stateVersion":2}}
                """.formatted(CONTRACT, CONTRACT, FARMER, TRADER)));
        verify(service).contractStatusChanged(CONTRACT, "PENDING_DEPOSIT", FARMER, TRADER, java.time.Instant.parse("2026-10-27T00:00:00Z"), 2L);
        verify(service, never()).contractCreated(any(), any(), any(), any(), any());
    }

    @Test
    void mismatchedKafkaKeyIsRejected() {
        ChatContractService service = mock(ChatContractService.class);
        ChatContractConsumer consumer = new ChatContractConsumer(new ObjectMapper(), service);
        assertThrows(IllegalArgumentException.class, () -> consumer.receive(record("wrong-key", """
                {"eventType":"CONTRACT_CREATED","eventVersion":1,"sourceService":"payment-service",
                 "referenceType":"CONTRACT","referenceId":"%s",
                 "data":{"contractId":"%s","offerId":"202fe3fd-626a-41c8-80fd-70af82c1f256",
                         "farmerId":"%s","traderId":"%s","status":"CREATED"}}
                """.formatted(CONTRACT, CONTRACT, FARMER, TRADER))));
        verifyNoInteractions(service);
    }

    private ConsumerRecord<String, String> record(String key, String value) {
        return new ConsumerRecord<>("soa.contract.lifecycle.v1", 0, 0L, key, value);
    }
}
