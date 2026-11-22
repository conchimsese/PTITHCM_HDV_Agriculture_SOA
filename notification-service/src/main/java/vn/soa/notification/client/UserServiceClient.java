package vn.soa.notification.client;

import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import vn.soa.notification.dto.UserAccessStateDto;
import vn.soa.notification.exception.AccessStateUnavailableException;
import vn.soa.notification.exception.AccountNotActiveException;

@Component
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);

    private final RestClient restClient;
    private final String internalServiceKey;

    public UserServiceClient(
            @Value("${app.user-service.base-url:http://localhost:8081}") String baseUrl,
            @Value("${app.security.internal-service-key:notification-secret-key}") String internalServiceKey
    ) {
        this.internalServiceKey = internalServiceKey;

        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.DEFAULTS
                .withConnectTimeout(Duration.ofMillis(1000))
                .withReadTimeout(Duration.ofMillis(1000));
        ClientHttpRequestFactory requestFactory = ClientHttpRequestFactories.get(settings);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public void verifyAccountActive(UUID accountId) {
        try {
            UserAccessStateDto response = restClient.get()
                    .uri("/internal/v1/accounts/{accountId}/access-state", accountId)
                    .header("X-Service-Key", internalServiceKey)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        if (res.getStatusCode().value() == 404) {
                            throw new AccountNotActiveException("Account does not exist: " + accountId);
                        }
                        if (res.getStatusCode().value() == 403) {
                            throw new AccountNotActiveException("Account is not active: " + accountId);
                        }
                        throw new AccountNotActiveException("User service rejected request: " + res.getStatusCode());
                    })
                    .body(UserAccessStateDto.class);

            if (response == null || !response.isActive()) {
                throw new AccountNotActiveException("Account is not ACTIVE: " + accountId);
            }
        } catch (AccountNotActiveException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to check user access-state for {}: {}", accountId, e.getMessage());
            throw new AccessStateUnavailableException("User service access-state unavailable or timed out");
        }
    }
}
