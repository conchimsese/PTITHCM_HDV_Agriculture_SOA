package vn.soa.notification.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import vn.soa.notification.entity.ReferenceType;
import vn.soa.notification.event.EventEnvelope;

import static org.assertj.core.api.Assertions.assertThat;

class CanonicalJsonUtilTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void canonicalHash_UnchangedByRecipientOrderOrDuplicates() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID user1 = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID user2 = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID refId = UUID.randomUUID();
        Instant occurredAt = Instant.parse("2026-10-19T10:00:00Z");

        // Envelope 1: user1, user2
        EventEnvelope env1 = new EventEnvelope(
                eventId, "OFFER_CREATED", 1, "trading-service",
                occurredAt, null, List.of(user1, user2),
                ReferenceType.OFFER, refId, "corr-1",
                mapper.readTree("{\"offerId\":\"" + refId + "\",\"amount\":100}")
        );

        // Envelope 2: user2, user1, duplicate user1
        EventEnvelope env2 = new EventEnvelope(
                eventId, "OFFER_CREATED", 1, "trading-service",
                occurredAt, null, List.of(user2, user1, user1),
                ReferenceType.OFFER, refId, "corr-1",
                mapper.readTree("{\"amount\":100,\"offerId\":\"" + refId + "\"}")
        );

        String hash1 = CanonicalJsonUtil.computePayloadHash(env1);
        String hash2 = CanonicalJsonUtil.computePayloadHash(env2);

        assertThat(hash1)
                .isNotNull()
                .hasSize(64)
                .isEqualTo(hash2);
    }

    @Test
    void canonicalHash_ChangesWhenBusinessDataChanges() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID user1 = UUID.randomUUID();
        UUID refId = UUID.randomUUID();
        Instant occurredAt = Instant.parse("2026-10-19T10:00:00Z");

        EventEnvelope env1 = new EventEnvelope(
                eventId, "OFFER_CREATED", 1, "trading-service",
                occurredAt, null, List.of(user1),
                ReferenceType.OFFER, refId, null,
                mapper.readTree("{\"price\":5000}")
        );

        EventEnvelope env2 = new EventEnvelope(
                eventId, "OFFER_CREATED", 1, "trading-service",
                occurredAt, null, List.of(user1),
                ReferenceType.OFFER, refId, null,
                mapper.readTree("{\"price\":6000}")
        );

        String hash1 = CanonicalJsonUtil.computePayloadHash(env1);
        String hash2 = CanonicalJsonUtil.computePayloadHash(env2);

        assertThat(hash1).isNotEqualTo(hash2);
    }
}
