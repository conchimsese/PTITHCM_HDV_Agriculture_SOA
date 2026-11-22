package vn.ptit.soa.payment.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("secure & database-learning")
public class ChatConversationClient {
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).build();
    private final ObjectMapper json;
    private final String baseUrl;
    public ChatConversationClient(ObjectMapper json, @Value("${CHAT_SERVICE_URL:}") String baseUrl) {
        this.json = json;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    public void requireAcceptedRoom(String roomId, String offerId, String farmerId,
            String traderId, String token) {
        String room = uuid(roomId), offer = uuid(offerId), farmer = uuid(farmerId);
        if (farmer.equals(traderId)) throw new IllegalArgumentException("Participants must differ.");
        if (baseUrl.isBlank()) throw new ChatUnavailableException();
        try {
            var request = HttpRequest.newBuilder(URI.create(baseUrl + "/api/v1/conversations/" + room))
                    .timeout(Duration.ofSeconds(2)).header("Authorization", "Bearer " + token).GET().build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 403 || response.statusCode() == 404)
                throw new IllegalArgumentException("Conversation is unavailable to this Trader.");
            if (response.statusCode() != 200) throw new ChatUnavailableException();
            var data = json.readTree(response.body());
            Set<String> participants = new HashSet<>();
            data.path("participantIds").forEach(p -> participants.add(p.asText()));
            if (!room.equals(data.path("conversationId").asText())
                    || !offer.equals(data.path("offerId").asText())
                    || !"ACTIVE".equals(data.path("status").asText())
                    || data.path("participantIds").size() != 2
                    || !participants.equals(Set.of(farmer, traderId)))
                throw new IllegalArgumentException("Offer, conversation and participants do not match.");
            if (data.hasNonNull("contractId"))
                throw new IllegalStateException("Conversation already has a Contract.");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new ChatUnavailableException();
        } catch (java.io.IOException failure) {
            throw new ChatUnavailableException();
        }
    }
    private String uuid(String input) {
        if (input == null) throw new IllegalArgumentException("UUID is required.");
        String parsed = UUID.fromString(input).toString();
        if (!parsed.equalsIgnoreCase(input)) throw new IllegalArgumentException("Invalid UUID.");
        return parsed;
    }
    public static class ChatUnavailableException extends RuntimeException {}
}
