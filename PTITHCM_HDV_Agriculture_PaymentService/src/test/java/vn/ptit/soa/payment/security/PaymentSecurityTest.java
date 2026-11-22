package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

class PaymentSecurityTest {
    private static final String ACCOUNT = "233196d7-d149-451d-8006-91e6563be4f0";
    @TempDir Path keys;

    @Test
    void secureProfileCannotExposeLearningEndpoints() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("secure", "learning", "database-learning");
        assertThrows(IllegalStateException.class, () -> new PaymentSecurityConfig(environment));
    }

    @Test
    void validatesSignatureKidIssuerAudienceAndIdentityClaims() throws Exception {
        KeyPair pair = generateKey();
        savePublicKey("first", pair);
        JwtDecoder decoder = new PaymentJwtConfig().jwtDecoder(keys.toString(), "urn:soa:user-service", "soa-api");
        assertDoesNotThrow(() -> decoder.decode(token(pair, "first", "urn:soa:user-service", "soa-api", ACCOUNT)));
        assertThrows(JwtException.class, () -> decoder.decode(token(generateKey(), "first", "urn:soa:user-service", "soa-api", ACCOUNT)));
        assertThrows(JwtException.class, () -> decoder.decode(token(pair, "unknown", "urn:soa:user-service", "soa-api", ACCOUNT)));
        assertThrows(JwtException.class, () -> decoder.decode(token(pair, "first", "wrong", "soa-api", ACCOUNT)));
        assertThrows(JwtException.class, () -> decoder.decode(token(pair, "first", "urn:soa:user-service", "wrong", ACCOUNT)));
        assertThrows(JwtException.class, () -> decoder.decode(token(pair, "first", "urn:soa:user-service", "soa-api", "not-a-uuid")));
        KeyPair rotated = generateKey();
        savePublicKey("second", rotated);
        JwtDecoder duringRotation = new PaymentJwtConfig().jwtDecoder(keys.toString(), "urn:soa:user-service", "soa-api");
        assertDoesNotThrow(() -> duringRotation.decode(token(pair, "first", "urn:soa:user-service", "soa-api", ACCOUNT)));
        assertDoesNotThrow(() -> duringRotation.decode(token(rotated, "second", "urn:soa:user-service", "soa-api", ACCOUNT)));
    }

    @Test
    void activeStatePassesButLockMismatchAndOutageFailClosed() throws Exception {
        AtomicInteger mode = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/internal/v1/accounts/" + ACCOUNT + "/access-state", exchange -> {
            int current = mode.get();
            String body = current == 1
                    ? "{\"accountId\":\"" + ACCOUNT + "\",\"status\":\"LOCKED\",\"role\":\"FARMER\",\"accessAllowed\":false}"
                    : current == 2
                    ? "{\"accountId\":\"" + ACCOUNT + "\",\"status\":\"ACTIVE\",\"role\":\"TRADER\",\"accessAllowed\":true}"
                    : "{\"accountId\":\"" + ACCOUNT + "\",\"status\":\"ACTIVE\",\"role\":\"FARMER\",\"accessAllowed\":true}";
            if (!"payment-test-key".equals(exchange.getRequestHeaders().getFirst("X-Service-Key"))) {
                exchange.sendResponseHeaders(401, -1);
            } else if (current == 3) {
                exchange.sendResponseHeaders(503, -1);
            } else {
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, bytes.length);
                exchange.getResponseBody().write(bytes);
            }
            exchange.close();
        });
        server.start();
        try {
            KeyPair pair = generateKey();
            savePublicKey("first", pair);
            Jwt jwt = new PaymentJwtConfig().jwtDecoder(keys.toString(), "urn:soa:user-service", "soa-api")
                    .decode(token(pair, "first", "urn:soa:user-service", "soa-api", ACCOUNT));
            UserAccessStateClient client = new UserAccessStateClient(new ObjectMapper(),
                    "http://127.0.0.1:" + server.getAddress().getPort(), "payment-test-key", 1000);
            assertThrows(UserAccessStateClient.AccountForbiddenException.class,
                    () -> client.requireActiveParticipantOrAdmin(mock(Jwt.class)));
            assertDoesNotThrow(() -> client.requireActiveParticipant(jwt));
            mode.set(1);
            assertThrows(UserAccessStateClient.AccountForbiddenException.class, () -> client.requireActiveParticipant(jwt));
            mode.set(2);
            assertThrows(UserAccessStateClient.AccountForbiddenException.class, () -> client.requireActiveParticipant(jwt));
            mode.set(3);
            assertThrows(UserAccessStateClient.AccessStateUnavailableException.class, () -> client.requireActiveParticipant(jwt));
        } finally {
            server.stop(0);
        }
    }

    private KeyPair generateKey() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }

    private void savePublicKey(String kid, KeyPair pair) throws Exception {
        String base64 = Base64.getMimeEncoder(64, new byte[] {'\n'}).encodeToString(pair.getPublic().getEncoded());
        Files.writeString(keys.resolve(kid + ".pem"), "-----BEGIN PUBLIC KEY-----\n" + base64
                + "\n-----END PUBLIC KEY-----\n");
    }

    private String token(KeyPair pair, String kid, String issuer, String audience, String subject) throws Exception {
        Instant now = Instant.now();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(kid).build(),
                new JWTClaimsSet.Builder().issuer(issuer).audience(audience).subject(subject)
                        .claim("role", "FARMER").issueTime(Date.from(now))
                        .expirationTime(Date.from(now.plusSeconds(900))).jwtID(UUID.randomUUID().toString()).build());
        jwt.sign(new RSASSASigner(pair.getPrivate()));
        return jwt.serialize();
    }
}
