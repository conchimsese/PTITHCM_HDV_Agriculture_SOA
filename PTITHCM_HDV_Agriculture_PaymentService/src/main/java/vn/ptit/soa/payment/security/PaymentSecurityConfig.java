package vn.ptit.soa.payment.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.DispatcherType;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class PaymentSecurityConfig {
    public PaymentSecurityConfig(Environment environment) {
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
                .addFilterAfter(new PaymentAccessStateFilter(access, json), BearerTokenAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers("/health").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/payments/contracts/*", "/api/v1/payments/deposits",
                                "/api/v1/payments/deposits/*", "/api/v1/payments/disputes/*",
                                "/api/v1/payments/disputes/*/evidence",
                                "/api/v1/payments/disputes/*/evidence/*",
                                "/api/v1/payments/admin/disputes")
                        .authenticated()
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/payments/contracts",
                                "/api/v1/payments/contracts/*/accept",
                                "/api/v1/payments/contracts/*/complete",
                                "/api/v1/payments/deposits/*/pay",
                                "/api/v1/payments/deposits/*/release",
                                "/api/v1/payments/contracts/*/disputes",
                                "/api/v1/payments/disputes/*/responses",
                                "/api/v1/payments/disputes/*/evidence",
                                "/api/v1/payments/admin/disputes/*/review",
                                "/api/v1/payments/admin/disputes/*/decisions",
                                "/api/v1/payments/admin/contracts/*/disputes",
                                "/api/v1/payments/admin/contracts/*/complete",
                                "/api/v1/payments/admin/decisions/*/reversal")
                        .authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/payments/contracts/*")
                        .authenticated()
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
