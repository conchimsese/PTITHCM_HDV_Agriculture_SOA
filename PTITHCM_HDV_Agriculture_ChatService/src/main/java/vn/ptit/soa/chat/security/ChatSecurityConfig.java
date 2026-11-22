package vn.ptit.soa.chat.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;

@Configuration
public class ChatSecurityConfig {
    public ChatSecurityConfig(Environment environment) {
        if (environment.matchesProfiles("secure & learning")) {
            throw new IllegalStateException("Do not enable learning endpoints with the secure profile.");
        }
    }

    @Bean
    @Profile("!secure")
    SecurityFilterChain learningSecurity(HttpSecurity http) throws Exception {
        return http.cors(Customizer.withDefaults()).csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll()).build();
    }

    @Bean
    @Profile("secure")
    SecurityFilterChain secureSecurity(HttpSecurity http, ObjectMapper json,
            UserAccessStateClient access) throws Exception {
        return http.cors(Customizer.withDefaults()).csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterAfter(new ChatAccessStateFilter(access, json), BearerTokenAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth.requestMatchers("/health").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // Browser WebSocket authenticates in its first CONNECT frame, never in the URL.
                        .requestMatchers("/ws/chat").permitAll()
                        .requestMatchers("/api/v1/conversations", "/api/v1/conversations/**").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults())
                        .authenticationEntryPoint((request, response, error) ->
                                writeError(json, response, request.getRequestURI(), HttpStatus.UNAUTHORIZED,
                                        "UNAUTHORIZED", "A valid access token is required.")))
                .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, error) ->
                                writeError(json, response, request.getRequestURI(), HttpStatus.UNAUTHORIZED,
                                        "UNAUTHORIZED", "A valid access token is required."))
                        .accessDeniedHandler((request, response, error) ->
                                writeError(json, response, request.getRequestURI(), HttpStatus.FORBIDDEN,
                                        "FORBIDDEN", "Access denied.")))
                .build();
    }

    static void writeError(ObjectMapper json, HttpServletResponse response, String path,
            HttpStatus status, String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");
        json.writeValue(response.getOutputStream(), Map.of("timestamp", Instant.now().toString(),
                "status", status.value(), "code", code, "message", message, "path", path));
    }
}
