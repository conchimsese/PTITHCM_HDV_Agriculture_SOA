package vn.ptit.soa.chat.contract;

import static org.junit.jupiter.api.Assertions.*;
import com.mongodb.client.MongoClients;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import vn.ptit.soa.chat.conversation.Conversation;
import vn.ptit.soa.chat.conversation.ConversationRepository;

@EnabledIfEnvironmentVariable(named = "REVIEW_MONGO_URI", matches = ".+")
class ChatContractVersionIntegrationTest {
    @Test
    void existingRoomWithoutVersionRejectsOldAndDuplicateUpdatesAfterAdvancing() {
        try (var client = MongoClients.create(System.getenv("REVIEW_MONGO_URI"))) {
            var mongo = new MongoTemplate(client, "review_" + UUID.randomUUID().toString().replace("-", ""));
            try {
                var rooms = new ConversationRepository(mongo);
                String room = UUID.randomUUID().toString(), contract = UUID.randomUUID().toString();
                rooms.insert(new Conversation(room, List.of("farmer", "trader"), UUID.randomUUID().toString(),
                        contract, "ACTIVE", Instant.EPOCH, Instant.EPOCH));
                assertTrue(rooms.advanceContractVersion(room, contract, 4, "COMPLETED"));
                assertFalse(rooms.advanceContractVersion(room, contract, 3, "ACTIVE"));
                assertFalse(rooms.advanceContractVersion(room, contract, 4, "COMPLETED"));
                assertFalse(rooms.advanceContractVersion(room, UUID.randomUUID().toString(), 5, "ACTIVE"));
                var stored = mongo.getCollection("conversations").find().first();
                assertEquals(4L, stored.getLong("contract_state_version"));
                assertEquals("COMPLETED", stored.getString("contract_status"));
            } finally { mongo.getDb().drop(); }
        }
    }
}
