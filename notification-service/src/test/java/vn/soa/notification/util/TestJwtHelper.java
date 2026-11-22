package vn.soa.notification.util;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.UUID;

public class TestJwtHelper {

    private static final RSAPrivateKey PRIVATE_KEY;

    static {
        try (InputStream is = TestJwtHelper.class.getResourceAsStream("/jwt/private.pem")) {
            if (is == null) {
                throw new IllegalStateException("Test private key not found at /jwt/private.pem");
            }
            String pem = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            String privateKeyPEM = pem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] encoded = Base64.getDecoder().decode(privateKeyPEM);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
            PRIVATE_KEY = (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load test private key", e);
        }
    }

    public static String createToken(UUID sub, String role) {
        return createToken(sub, role, "urn:soa:user-service", "soa-api", 900);
    }

    public static String createToken(UUID sub, String role, String issuer, String audience, long ttlSeconds) {
        try {
            RSASSASigner signer = new RSASSASigner(PRIVATE_KEY);
            Date now = new Date();
            Date exp = new Date(now.getTime() + (ttlSeconds * 1000));

            JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                    .subject(sub.toString())
                    .issuer(issuer)
                    .audience(List.of(audience))
                    .claim("role", role)
                    .issueTime(now)
                    .expirationTime(exp)
                    .jwtID(UUID.randomUUID().toString())
                    .build();

            SignedJWT signedJWT = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(),
                    claimsSet
            );

            signedJWT.sign(signer);
            return signedJWT.serialize();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate test JWT", e);
        }
    }
}
