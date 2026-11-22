package vn.ptit.soa.payment.security;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.*;
@Configuration
public class ApiCorsConfig {
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${API_ALLOWED_ORIGINS:http://localhost:5173,http://127.0.0.1:5173}") String origins) {
        CorsConfiguration cors = new CorsConfiguration();
        var allowed = Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        if (allowed.isEmpty() || allowed.contains("*")) throw new IllegalArgumentException("Explicit CORS origins required.");
        cors.setAllowedOrigins(allowed);
        cors.setAllowedMethods(List.of("GET","POST","PATCH","PUT","DELETE","OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization","Content-Type","Idempotency-Key"));
        cors.setAllowCredentials(false);
        cors.setMaxAge(600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/v1/**", cors);
        return source;
    }
}
