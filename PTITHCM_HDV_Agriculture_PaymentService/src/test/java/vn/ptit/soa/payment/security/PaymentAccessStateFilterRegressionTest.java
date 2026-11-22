package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class PaymentAccessStateFilterRegressionTest {
    @Test
    void everyLifecycleRouteFailsClosedBeforeController() throws Exception {
        for (String route : List.of("POST /api/v1/payments/contracts", "PATCH /api/v1/payments/contracts/id",
                "POST /api/v1/payments/contracts/id/accept", "POST /api/v1/payments/deposits/id/pay")) {
            for (boolean unavailable : List.of(false, true)) {
                var access = mock(UserAccessStateClient.class);
                var jwt = mock(Jwt.class);
                when(jwt.getTokenValue()).thenReturn("test");
                var failure = unavailable ? new UserAccessStateClient.AccessStateUnavailableException()
                        : new UserAccessStateClient.AccountForbiddenException();
                doThrow(failure).when(access).requireActiveParticipant(jwt);
                SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
                try {
                    var parts = route.split(" ");
                    var request = new MockHttpServletRequest(parts[0], parts[1]);
                    var response = new MockHttpServletResponse();
                    var chain = mock(jakarta.servlet.FilterChain.class);
                    new PaymentAccessStateFilter(access, new ObjectMapper()).doFilter(request, response, chain);
                    assertEquals(unavailable ? 503 : 403, response.getStatus(), route);
                    verifyNoInteractions(chain);
                } finally { SecurityContextHolder.clearContext(); }
            }
        }
    }
}
