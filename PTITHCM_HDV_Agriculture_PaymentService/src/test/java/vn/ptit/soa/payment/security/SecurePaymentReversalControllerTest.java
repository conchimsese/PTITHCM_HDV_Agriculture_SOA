package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import vn.ptit.soa.payment.dispute.DecisionReversal;
import vn.ptit.soa.payment.dispute.DecisionReversalService;

class SecurePaymentReversalControllerTest {
    private static final String ORIGINAL = "11111111-1111-4111-8111-111111111111";
    private static final String REVERSAL = "22222222-2222-4222-8222-222222222222";
    private static final String EVIDENCE = "33333333-3333-4333-8333-333333333333";
    private static final String ADMIN2 = "00000000-0000-0000-0000-000000000002";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";

    @Test
    void takesActorFromJwtAndRejectsParticipant() {
        DecisionReversalService service = mock(DecisionReversalService.class);
        var controller = new SecurePaymentReversalController(service);
        var request = new SecurePaymentReversalController.ReversalRequest(
                REVERSAL, "Corrected", List.of(EVIDENCE));
        when(service.reverse(ORIGINAL, REVERSAL, ADMIN2, "Corrected", List.of(EVIDENCE)))
                .thenReturn(new DecisionReversal(REVERSAL, ORIGINAL, ORIGINAL, ADMIN2,
                        "Corrected", List.of(EVIDENCE), Instant.parse("2026-10-20T00:00:00Z")));
        assertEquals(ADMIN2, controller.reverse(ORIGINAL, request,
                jwt(ADMIN2, "ADMIN")).adminId());
        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.reverse(ORIGINAL, request, jwt(FARMER, "FARMER")));
        verify(service).reverse(ORIGINAL, REVERSAL, ADMIN2, "Corrected", List.of(EVIDENCE));
        verify(service, never()).reverse(ORIGINAL, REVERSAL, FARMER, "Corrected", List.of(EVIDENCE));
    }

    private Jwt jwt(String id, String role) {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(id);
        when(jwt.getClaimAsString("role")).thenReturn(role);
        return jwt;
    }
}
