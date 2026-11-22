package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ChatConversationClientTest {
    @Test
    void verifiesAuthoritativeRoomAndFailsClosedOnMismatchOrOutage() throws Exception {
        String room="11111111-1111-4111-8111-111111111111",offer="22222222-2222-4222-8222-222222222222";
        String farmer="33333333-3333-4333-8333-333333333333",trader="44444444-4444-4444-8444-444444444444";
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/api/v1/conversations/"+room, exchange -> {
            assertEquals("Bearer trader-token", exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] bytes=("{\"conversationId\":\""+room+"\",\"offerId\":\""+offer+"\",\"status\":\"ACTIVE\",\"participantIds\":[\""+farmer+"\",\""+trader+"\"]}").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        });server.start();
        var client=new ChatConversationClient(new ObjectMapper(),"http://127.0.0.1:"+server.getAddress().getPort());
        try {
            assertDoesNotThrow(()->client.requireAcceptedRoom(room,offer,farmer,trader,"trader-token"));
            assertThrows(IllegalArgumentException.class,()->client.requireAcceptedRoom(room,room,farmer,trader,"trader-token"));
        } finally {server.stop(0);}
        assertThrows(ChatConversationClient.ChatUnavailableException.class,()->client.requireAcceptedRoom(room,offer,farmer,trader,"trader-token"));
    }
}
