package vn.ptit.soa.payment.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("database-learning")
public class TradingDepositClient {
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(1)).build();
    private final ObjectMapper json;
    private final String baseUrl;
    private final String serviceKey;

    public TradingDepositClient(ObjectMapper json,
            @Value("${TRADING_SERVICE_URL:}") String baseUrl,
            @Value("${TRADING_SERVICE_KEY:}") String serviceKey) {
        this.json = json;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.serviceKey = serviceKey;
    }

    public void commit(Contract contract, PaymentTracking tracking) {
        if (baseUrl.isBlank() || serviceKey.isBlank()) {
            throw new TradingUnavailableException("Trading service URL and key are required.");
        }
        String path = "/internal/v1/offers/" + contract.offerId() + "/deposit-commit";
        try {
            String body = json.writeValueAsString(Map.of(
                    "contractId", contract.contractId(),
                    "paymentTrackingId", tracking.paymentTrackingId(),
                    "depositAmount", tracking.depositAmount().toPlainString(),
                    "currency", "VND"));
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path))
                    .timeout(Duration.ofSeconds(2))
                    .header("Content-Type", "application/json")
                    .header("X-Service-Key", serviceKey)
                    .header("Idempotency-Key", tracking.paymentTrackingId())
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                requireMatchingResult(response.body(), contract, tracking);
                return;
            }
            if (response.statusCode() == 409) {
                throw new DepositClaimConflictException("Listing was committed to another Contract.");
            }
        } catch (DepositClaimConflictException | TradingUnavailableException known) {
            throw known;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new TradingUnavailableException("Trading claim outcome is unknown; retry this Contract.");
        } catch (IOException | IllegalArgumentException failed) {
            // The POST may have committed at Trading even if its response was lost.
        }
        recover(contract, tracking, path);
    }

    private void recover(Contract contract, PaymentTracking tracking, String path) {
        try {
            String query = "?contractId=" + encode(contract.contractId())
                    + "&paymentTrackingId=" + encode(tracking.paymentTrackingId());
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path + query))
                    .timeout(Duration.ofSeconds(2)).header("X-Service-Key", serviceKey).GET().build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                requireMatchingResult(response.body(), contract, tracking);
                return;
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        } catch (IOException | IllegalArgumentException failed) {
            // Unknown is never treated as a successful simulated payment.
        }
        throw new TradingUnavailableException("Trading claim outcome is unknown; retry this Contract.");
    }

    private void requireMatchingResult(String body, Contract contract, PaymentTracking tracking) {
        try {
            JsonNode root = json.readTree(body);
            JsonNode result = root.hasNonNull("data") ? root.path("data") : root;
            if (!contract.offerId().equals(result.path("offerId").asText())
                    || !contract.contractId().equals(result.path("contractId").asText())
                    || !tracking.paymentTrackingId().equals(result.path("paymentTrackingId").asText())
                    || !"LOCKED".equals(result.path("listingStatus").asText())
                    || result.path("listingId").asText().isBlank()) {
                throw new TradingUnavailableException("Trading returned an inconsistent claim.");
            }
        } catch (IOException invalid) {
            throw new TradingUnavailableException("Trading returned an invalid claim.");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public static class TradingUnavailableException extends RuntimeException {
        public TradingUnavailableException(String message) { super(message); }
    }

    public static class DepositClaimConflictException extends IllegalStateException {
        public DepositClaimConflictException(String message) { super(message); }
    }
}
