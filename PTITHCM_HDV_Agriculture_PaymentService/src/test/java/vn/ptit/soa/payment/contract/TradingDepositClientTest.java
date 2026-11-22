package vn.ptit.soa.payment.contract;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TradingDepositClientTest {
    private static final String OFFER = "202fe3fd-626a-41c8-80fd-70af82c1f256";
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String TRACKING = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private HttpServer server;
    private Contract contract;
    private PaymentTracking tracking;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        Instant now = Instant.now();
        contract = new Contract(CONTRACT, OFFER, "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0",
                "233196d7-d149-451d-8006-91e6563be4f0",
                "e14961fb-7e5a-4613-8837-8cadf6a887de",
                new BigDecimal("10000010.00"), "Terms", now.plusSeconds(86400),
                "PENDING_DEPOSIT", new BigDecimal("20.00"), null, 2, now, now);
        tracking = new PaymentTracking(TRACKING, CONTRACT, new BigDecimal("5.00"),
                new BigDecimal("500001.00"), "PENDING", null, now.plusSeconds(86400),
                null, null, null, false, 1, now, now);
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void commitsWithStableKeyAndServerCalculatedAmount() {
        server.createContext("/internal/v1/offers/" + OFFER + "/deposit-commit", exchange -> {
            assertEquals("POST", exchange.getRequestMethod());
            assertEquals("test-key", exchange.getRequestHeaders().getFirst("X-Service-Key"));
            assertEquals(TRACKING, exchange.getRequestHeaders().getFirst("Idempotency-Key"));
            String request = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals("500001.00", new ObjectMapper().readTree(request).path("depositAmount").asText());
            respond(exchange, 200, claim());
        });
        assertDoesNotThrow(() -> client().commit(contract, tracking));
    }

    @Test
    void rejectsAnotherWinner() {
        server.createContext("/internal/v1/offers/" + OFFER + "/deposit-commit",
                exchange -> respond(exchange, 409, "{}"));
        assertThrows(TradingDepositClient.DepositClaimConflictException.class,
                () -> client().commit(contract, tracking));
    }

    @Test
    void recoversUncertainPostUsingTheSameTrackingId() {
        AtomicInteger calls = new AtomicInteger();
        server.createContext("/internal/v1/offers/" + OFFER + "/deposit-commit", exchange -> {
            calls.incrementAndGet();
            if ("POST".equals(exchange.getRequestMethod())) respond(exchange, 503, "{}");
            else {
                assertEquals("contractId=" + CONTRACT + "&paymentTrackingId=" + TRACKING,
                        exchange.getRequestURI().getRawQuery());
                respond(exchange, 200, claim());
            }
        });
        assertDoesNotThrow(() -> client().commit(contract, tracking));
        assertEquals(2, calls.get());
    }

    @Test
    void neverTreatsUnknownOrMismatchedClaimAsPaid() {
        server.createContext("/internal/v1/offers/" + OFFER + "/deposit-commit", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) respond(exchange, 503, "{}");
            else respond(exchange, 404, "{}");
        });
        assertThrows(TradingDepositClient.TradingUnavailableException.class,
                () -> client().commit(contract, tracking));
    }

    private TradingDepositClient client() {
        return new TradingDepositClient(new ObjectMapper(),
                "http://127.0.0.1:" + server.getAddress().getPort(), "test-key");
    }

    private String claim() {
        return "{\"offerId\":\"" + OFFER + "\",\"listingId\":\"233196d7-d149-451d-8006-91e6563be4f0\""
                + ",\"contractId\":\"" + CONTRACT + "\",\"paymentTrackingId\":\""
                + TRACKING + "\",\"listingStatus\":\"LOCKED\"}";
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
