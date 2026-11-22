package vn.ptit.soa.chat.security;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import vn.ptit.soa.chat.conversation.ConversationReadService;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageService;
import vn.ptit.soa.chat.media.ChatMediaService;
import vn.ptit.soa.chat.media.ChatImageCodec;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"secure", "database-learning"})
class SecureConversationHttpTest {
    private static final String ACCOUNT = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String ROOM = "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0";
    private static final String MESSAGE = "a9d2c9e8-c777-4683-8238-1fda1bb4c653";
    private static final AtomicInteger STATE = new AtomicInteger();
    private static final KeyPair KEY;
    private static final Path KEY_DIR;
    private static final HttpServer USER;

    static {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KEY = generator.generateKeyPair();
            KEY_DIR = Files.createTempDirectory("chat-public-keys-");
            String encoded = Base64.getMimeEncoder(64, new byte[] {'\n'}).encodeToString(KEY.getPublic().getEncoded());
            Files.writeString(KEY_DIR.resolve("test-key.pem"), "-----BEGIN PUBLIC KEY-----\n"
                    + encoded + "\n-----END PUBLIC KEY-----\n");
            USER = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            USER.createContext("/internal/v1/accounts/" + ACCOUNT + "/access-state", exchange -> {
                String body = STATE.get() == 1
                        ? "{\"accountId\":\"" + ACCOUNT + "\",\"status\":\"LOCKED\",\"role\":\"FARMER\",\"accessAllowed\":false}"
                        : "{\"accountId\":\"" + ACCOUNT + "\",\"status\":\"ACTIVE\",\"role\":\"FARMER\",\"accessAllowed\":true}";
                if (STATE.get() == 2 || !"chat-key".equals(exchange.getRequestHeaders().getFirst("X-Service-Key"))) {
                    exchange.sendResponseHeaders(503, -1);
                } else {
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, bytes.length);
                    exchange.getResponseBody().write(bytes);
                }
                exchange.close();
            });
            USER.start();
        } catch (Exception failure) {
            throw new ExceptionInInitializerError(failure);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("chat.jwt.public-key-directory", KEY_DIR::toString);
        registry.add("chat.user-service-url", () -> "http://127.0.0.1:" + USER.getAddress().getPort());
        registry.add("chat.internal-service-key", () -> "chat-key");
    }

    @Autowired MockMvc mvc;
    @MockitoBean ConversationReadService reads;
    @MockitoBean ChatMessageService messages;
    @MockitoBean ChatMediaService media;

    @Test
    void requestMustHaveValidJwtAndActiveStateBeforeReading() throws Exception {
        when(reads.list(eq(ACCOUNT), eq(20), isNull())).thenReturn(
                new ConversationReadService.ConversationPage(List.of(), null));
        mvc.perform(get("/api/v1/conversations")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/conversations").header("Authorization", "Bearer bad-token"))
                .andExpect(status().isUnauthorized());
        STATE.set(0);
        mvc.perform(get("/api/v1/conversations").header("Authorization", "Bearer " + token()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isArray());
        STATE.set(1);
        mvc.perform(get("/api/v1/conversations").header("Authorization", "Bearer " + token()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVE"));
        STATE.set(2);
        mvc.perform(get("/api/v1/conversations").header("Authorization", "Bearer " + token()))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("ACCESS_STATE_UNAVAILABLE"));
    }

    @Test
    void messageEndpointsUseJwtIdentityAndRejectSpoofedSender() throws Exception {
        STATE.set(0);
        when(messages.sendText(ROOM, ACCOUNT, "Hello")).thenReturn(new ChatMessage(
                MESSAGE, ROOM, ACCOUNT, "TEXT", "Hello", null, null, false, Instant.now(), null));
        mvc.perform(post("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token())
                        .contentType("application/json")
                        .content("{\"messageType\":\"TEXT\",\"content\":\"Hello\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.senderId").value(ACCOUNT))
                .andExpect(jsonPath("$.isRead").doesNotExist());
        verify(messages).sendText(ROOM, ACCOUNT, "Hello");

        mvc.perform(post("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token())
                        .contentType("application/json")
                        .content("{\"messageType\":\"TEXT\",\"content\":\"No\",\"senderId\":\"fake\"}"))
                .andExpect(status().isBadRequest());
        verify(messages, never()).sendText(ROOM, "fake", "No");
        mvc.perform(post("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token())
                        .contentType("application/json")
                        .content("{\"messageType\":\"IMAGE\",\"content\":\"should be empty\",\"attachmentUrl\":\"/x\"}"))
                .andExpect(status().isBadRequest());
        String imageUrl = ChatMediaService.apiUrl(ROOM, "9cd756ec-53a1-461c-9960-6c648b157853");
        when(messages.sendImageSecure(ROOM, ACCOUNT, imageUrl)).thenReturn(new ChatMessage(
                MESSAGE, ROOM, ACCOUNT, "IMAGE", null, imageUrl, null, false, Instant.now(), null));
        mvc.perform(post("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token())
                        .contentType("application/json")
                        .content("{\"messageType\":\"IMAGE\",\"attachmentUrl\":\"" + imageUrl + "\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.attachmentUrl").value(imageUrl));
        verify(messages).sendImageSecure(ROOM, ACCOUNT, imageUrl);

        when(messages.history(ROOM, ACCOUNT, 20, null))
                .thenReturn(new ChatMessageService.MessagePage(List.of(), null));
        mvc.perform(get("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isArray());
        when(messages.markRead(ROOM, ACCOUNT, MESSAGE))
                .thenReturn(new ChatMessageService.ReadResult(MESSAGE, true, Instant.now(), 0));
        mvc.perform(put("/api/v1/conversations/{id}/read", ROOM)
                        .header("Authorization", "Bearer " + token())
                        .contentType("application/json").content("{\"messageId\":\"" + MESSAGE + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isRead").value(true));
        verify(messages).markRead(ROOM, ACCOUNT, MESSAGE);
    }

    @Test
    void mediaEndpointsCheckStateBeforeMultipartAndReturnPrivateBytes() throws Exception {
        String mediaId = "9cd756ec-53a1-461c-9960-6c648b157853";
        String apiUrl = ChatMediaService.apiUrl(ROOM, mediaId);
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[] {1, 2, 3});
        when(media.uploadSecure(eq(ROOM), eq(ACCOUNT), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new ChatMediaService.UploadResult(mediaId, apiUrl, "image/png", 3));
        STATE.set(1);
        mvc.perform(multipart("/api/v1/conversations/{id}/media", ROOM).file(file)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isForbidden());
        verify(media, never()).uploadSecure(eq(ROOM), eq(ACCOUNT), org.mockito.ArgumentMatchers.any());
        mvc.perform(multipart("/api/v1/conversations/{id}/media", ROOM).file(file))
                .andExpect(status().isUnauthorized());
        STATE.set(2);
        mvc.perform(multipart("/api/v1/conversations/{id}/media", ROOM).file(file)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isServiceUnavailable());
        STATE.set(0);
        mvc.perform(multipart("/api/v1/conversations/{id}/media", ROOM).file(file)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.attachmentUrl").value(apiUrl));
        when(media.download(ROOM, mediaId, ACCOUNT))
                .thenReturn(new ChatMediaService.DownloadResult("image/png", new byte[] {1, 2, 3}));
        mvc.perform(get("/api/v1/conversations/{id}/media/{mediaId}", ROOM, mediaId)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isOk()).andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
        when(media.download(ROOM, mediaId, ACCOUNT)).thenThrow(new ChatMediaService.MediaNotFoundException());
        mvc.perform(get("/api/v1/conversations/{id}/media/{mediaId}", ROOM, mediaId)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/conversations/{id}/media/{mediaId}", ROOM, mediaId)
                        .header("Authorization", "Bearer " + token("ADMIN")))
                .andExpect(status().isNotFound());
        doThrow(new ChatImageCodec.UnsupportedImageException()).when(media)
                .uploadSecure(eq(ROOM), eq(ACCOUNT), org.mockito.ArgumentMatchers.any());
        mvc.perform(multipart("/api/v1/conversations/{id}/media", ROOM).file(file)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
        doThrow(new ChatImageCodec.ImageTooLargeException()).when(media)
                .uploadSecure(eq(ROOM), eq(ACCOUNT), org.mockito.ArgumentMatchers.any());
        mvc.perform(multipart("/api/v1/conversations/{id}/media", ROOM).file(file)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("PAYLOAD_TOO_LARGE"));
    }

    @Test
    void messageEndpointsCheckAccountRoomAndBusinessErrors() throws Exception {
        STATE.set(1);
        mvc.perform(get("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVE"));
        STATE.set(2);
        mvc.perform(get("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("ACCESS_STATE_UNAVAILABLE"));
        STATE.set(0);
        when(reads.detail(ROOM, ACCOUNT)).thenThrow(new ConversationReadService.ConversationAccessDeniedException());
        mvc.perform(get("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        org.mockito.Mockito.reset(reads);
        when(messages.sendText(ROOM, ACCOUNT, "Closed"))
                .thenThrow(new ChatMessageService.ClosedConversationException());
        mvc.perform(post("/api/v1/conversations/{id}/messages", ROOM)
                        .header("Authorization", "Bearer " + token())
                        .contentType("application/json")
                        .content("{\"messageType\":\"TEXT\",\"content\":\"Closed\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATE_TRANSITION"));
        when(messages.markRead(ROOM, ACCOUNT, MESSAGE))
                .thenThrow(new ChatMessageService.MissingMessageException());
        mvc.perform(put("/api/v1/conversations/{id}/read", ROOM)
                        .header("Authorization", "Bearer " + token())
                        .contentType("application/json").content("{\"messageId\":\"" + MESSAGE + "\"}"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    private String token() throws Exception {
        return token("FARMER");
    }

    private String token(String role) throws Exception {
        Instant now = Instant.now();
        SignedJWT token = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(),
                new JWTClaimsSet.Builder().issuer("urn:soa:user-service").audience("soa-api")
                        .subject(ACCOUNT).claim("role", role).issueTime(Date.from(now))
                        .expirationTime(Date.from(now.plusSeconds(900))).jwtID(UUID.randomUUID().toString()).build());
        token.sign(new RSASSASigner(KEY.getPrivate()));
        return token.serialize();
    }
}
