package vn.ptit.soa.chat.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
@Profile("secure")
public class UserAccessStateClient {
    private final HttpClient http;
    private final ObjectMapper json;
    private final URI baseUrl;
    private final String serviceKey;
    private final Duration timeout;

    public UserAccessStateClient(ObjectMapper json,
            @Value("${chat.user-service-url}") String baseUrl,
            @Value("${chat.internal-service-key}") String serviceKey,
            @Value("${chat.access-state-timeout-ms:1000}") long timeoutMs) {
        if (serviceKey.isBlank() || timeoutMs < 1 || timeoutMs > 1000) {
            throw new IllegalArgumentException("Service key and 1-1000 ms access-state timeout are required.");
        }
        this.json = json;
        this.baseUrl = URI.create(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
        this.serviceKey = serviceKey;
        this.timeout = Duration.ofMillis(timeoutMs);
        this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
    }

    public void requireActiveParticipant(Jwt jwt) {
        String role = jwt.getClaimAsString("role");
        if (!"FARMER".equals(role) && !"TRADER".equals(role)) throw new AccountForbiddenException();
        HttpRequest request = HttpRequest.newBuilder(baseUrl.resolve("internal/v1/accounts/" + jwt.getSubject() + "/access-state"))
                .header("X-Service-Key", serviceKey).header("Accept", "application/json")
                .timeout(timeout).GET().build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 404) throw new AccountForbiddenException();
            if (response.statusCode() != 200) throw new AccessStateUnavailableException();
            AccessState state = json.readValue(response.body(), AccessState.class);
            if (state == null || !jwt.getSubject().equals(state.accountId()) || state.status() == null
                    || state.role() == null || state.accessAllowed() == null) {
                throw new AccessStateUnavailableException();
            }
            if (!"ACTIVE".equals(state.status()) || !state.accessAllowed() || !role.equals(state.role())) {
                throw new AccountForbiddenException();
            }
        } catch (AccountForbiddenException | AccessStateUnavailableException known) {
            throw known;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AccessStateUnavailableException();
        } catch (Exception unavailable) {
            throw new AccessStateUnavailableException();
        }
    }

    private record AccessState(String accountId, String status, String role, Boolean accessAllowed) {}

    public static class AccountForbiddenException extends RuntimeException {}
    public static class AccessStateUnavailableException extends RuntimeException {}
}
