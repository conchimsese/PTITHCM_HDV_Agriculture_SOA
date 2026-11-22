package vn.ptit.soa.chat.learning;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@Profile("learning & database-learning")
public class LearningChatWebSocketConfig implements WebSocketConfigurer {
    private final LearningChatWebSocketHandler handler;
    private final String[] allowedOrigins;

    public LearningChatWebSocketConfig(LearningChatWebSocketHandler handler,
            @Value("${chat.websocket.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
            String allowedOrigins) {
        this.handler = handler;
        this.allowedOrigins = allowedOrigins.split(",");
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/learning/ws/chat").setAllowedOrigins(allowedOrigins);
    }
}
