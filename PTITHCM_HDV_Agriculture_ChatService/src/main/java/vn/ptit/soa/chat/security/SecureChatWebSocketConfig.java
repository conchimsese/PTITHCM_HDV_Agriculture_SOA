package vn.ptit.soa.chat.security;

import java.util.Arrays;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Configuration
@EnableWebSocket
@Profile("secure & database-learning")
public class SecureChatWebSocketConfig implements WebSocketConfigurer {
    private final SecureChatWebSocketHandler handler;
    private final String[] allowedOrigins;

    public SecureChatWebSocketConfig(SecureChatWebSocketHandler handler,
            @Value("${chat.websocket.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
            String origins) {
        this.handler = handler;
        this.allowedOrigins = Arrays.stream(origins.split(",")).map(String::trim)
                .filter(value -> !value.isEmpty()).toArray(String[]::new);
        if (allowedOrigins.length == 0 || Arrays.asList(allowedOrigins).contains("*"))
            throw new IllegalArgumentException("Explicit Chat WebSocket origins are required.");
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/chat")
                .addInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                            WebSocketHandler wsHandler, Map<String, Object> attributes) {
                        if (request.getURI().getRawQuery() != null) {
                            response.setStatusCode(HttpStatus.BAD_REQUEST);
                            return false;
                        }
                        return true;
                    }

                    @Override
                    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                            WebSocketHandler wsHandler, Exception exception) { }
                })
                .setAllowedOrigins(allowedOrigins);
    }
}
