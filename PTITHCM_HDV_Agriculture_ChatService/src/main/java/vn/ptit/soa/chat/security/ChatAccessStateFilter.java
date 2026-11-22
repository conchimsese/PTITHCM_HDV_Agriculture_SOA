package vn.ptit.soa.chat.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

// Runs inside Spring Security after JWT authentication and before MVC parses multipart uploads.
final class ChatAccessStateFilter extends OncePerRequestFilter {
    private final UserAccessStateClient access;
    private final ObjectMapper json;

    ChatAccessStateFilter(UserAccessStateClient access, ObjectMapper json) {
        this.access = access;
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.equals("/api/v1/conversations") || path.startsWith("/api/v1/conversations/")) {
            if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken jwt) {
                if (path.matches("/api/v1/conversations/[^/]+/media(?:/.*)?")
                        && "ADMIN".equals(jwt.getToken().getClaimAsString("role"))) {
                    ChatSecurityConfig.writeError(json, response, request.getRequestURI(), HttpStatus.NOT_FOUND,
                            "NOT_FOUND", "Image not found.");
                    return;
                }
                try {
                    access.requireActiveParticipant(jwt.getToken());
                } catch (UserAccessStateClient.AccountForbiddenException denied) {
                    ChatSecurityConfig.writeError(json, response, request.getRequestURI(), HttpStatus.FORBIDDEN,
                            "ACCOUNT_NOT_ACTIVE", "Account is not active or not allowed for Chat.");
                    return;
                } catch (UserAccessStateClient.AccessStateUnavailableException unavailable) {
                    ChatSecurityConfig.writeError(json, response, request.getRequestURI(), HttpStatus.SERVICE_UNAVAILABLE,
                            "ACCESS_STATE_UNAVAILABLE", "Cannot verify account state.");
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }
}
