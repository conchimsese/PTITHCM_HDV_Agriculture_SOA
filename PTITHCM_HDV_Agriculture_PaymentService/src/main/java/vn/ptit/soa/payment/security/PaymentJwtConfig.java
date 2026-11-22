package vn.ptit.soa.payment.security;

import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;

@Configuration
@Profile("secure")
public class PaymentJwtConfig {
    @Bean
    JwtDecoder jwtDecoder(@Value("${payment.jwt.public-key-directory}") String keyDirectory,
            @Value("${payment.jwt.issuer}") String issuer,
            @Value("${payment.jwt.audience}") String audience) throws Exception {
        Map<String, JwtDecoder> decoders = new HashMap<>();
        try (var paths = Files.list(Path.of(keyDirectory))) {
            for (Path path : paths.filter(p -> p.getFileName().toString().matches("[A-Za-z0-9_-]+\\.pem")).toList()) {
                String filename = path.getFileName().toString();
                String kid = filename.substring(0, filename.length() - 4);
                String pem = Files.readString(path, StandardCharsets.US_ASCII)
                        .replace("-----BEGIN PUBLIC KEY-----", "")
                        .replace("-----END PUBLIC KEY-----", "").replaceAll("\\s", "");
                RSAPublicKey publicKey = (RSAPublicKey) KeyFactory.getInstance("RSA")
                        .generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(pem)));
                NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
                decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                        new JwtTimestampValidator(Duration.ofSeconds(60)),
                        JwtValidators.createDefaultWithIssuer(issuer),
                        jwt -> jwt.getAudience().contains(audience)
                                ? OAuth2TokenValidatorResult.success() : invalid("Invalid audience"),
                        jwt -> hasRequiredClaims(jwt)
                                ? OAuth2TokenValidatorResult.success() : invalid("Invalid identity claims")));
                decoders.put(kid, decoder);
            }
        }
        if (decoders.isEmpty()) throw new IllegalStateException("No JWT public keys found in " + keyDirectory);
        Map<String, JwtDecoder> trusted = Map.copyOf(decoders);
        return token -> {
            try {
                String kid = SignedJWT.parse(token).getHeader().getKeyID();
                JwtDecoder decoder = kid == null ? null : trusted.get(kid);
                if (decoder == null) throw new BadJwtException("Unknown JWT key ID");
                return decoder.decode(token);
            } catch (java.text.ParseException invalid) {
                throw new BadJwtException("Malformed JWT", invalid);
            } catch (JwtException invalid) {
                throw invalid;
            }
        };
    }

    private static boolean hasRequiredClaims(Jwt jwt) {
        try {
            String sub = jwt.getSubject();
            if (sub == null || !UUID.fromString(sub).toString().equalsIgnoreCase(sub)) return false;
            if (!java.util.Set.of("FARMER", "TRADER", "ADMIN").contains(jwt.getClaimAsString("role"))) return false;
            return jwt.getIssuedAt() != null && jwt.getExpiresAt() != null
                    && !jwt.getIssuedAt().isAfter(Instant.now().plusSeconds(60))
                    && !jwt.getExpiresAt().isAfter(jwt.getIssuedAt().plusSeconds(900))
                    && jwt.getId() != null && !jwt.getId().isBlank();
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    private static OAuth2TokenValidatorResult invalid(String reason) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", reason, null));
    }
}
