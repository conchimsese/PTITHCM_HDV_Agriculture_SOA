package vn.soa.notification.security;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class JwtUserConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String sub = jwt.getSubject();
        UUID userId;
        try {
            userId = UUID.fromString(sub);
        } catch (IllegalArgumentException e) {
            userId = null;
        }

        String role = jwt.getClaimAsString("role");
        Collection<GrantedAuthority> authorities = List.of();
        if (role != null && !role.isBlank()) {
            authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
        }

        return new JwtAuthenticationToken(jwt, authorities, sub);
    }
}
