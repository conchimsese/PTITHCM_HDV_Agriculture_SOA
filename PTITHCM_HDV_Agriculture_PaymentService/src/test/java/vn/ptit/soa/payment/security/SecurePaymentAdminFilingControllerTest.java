package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import vn.ptit.soa.payment.dispute.AdminDisputeFilingService;
import vn.ptit.soa.payment.dispute.Dispute;

class SecurePaymentAdminFilingControllerTest {
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final Instant NOW = Instant.parse("2026-10-20T00:00:00Z");

    @Test
    void usesAdminJwtAndReturnsOnlyPublicDisputeSummary() {
        AdminDisputeFilingService service = mock(AdminDisputeFilingService.class);
        var controller = new SecurePaymentAdminFilingController(service);
        var request = new SecurePaymentAdminFilingController.OpenRequest(
                FARMER, "LATE_COMPLAINT", "Farmer asked support to file", "Verified registered email");
        when(service.open(CONTRACT, ADMIN, FARMER, request.reasonCode(),
                request.description(), request.verificationNote())).thenReturn(new Dispute(
                        DISPUTE, CONTRACT, FARMER, request.reasonCode(), request.description(),
                        "OPEN", false, null, null, null, null, 1, 0, NOW, NOW));

        var result = controller.open(CONTRACT, request, jwt(ADMIN, "ADMIN"));
        assertEquals(DISPUTE, result.disputeId());
        assertEquals("OPEN", result.status());
        assertEquals(false, result.depositHold());
        verify(service).open(CONTRACT, ADMIN, FARMER, request.reasonCode(),
                request.description(), request.verificationNote());

        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.open(CONTRACT, request, jwt(FARMER, "FARMER")));
        verify(service, never()).open(CONTRACT, FARMER, FARMER,
                request.reasonCode(), request.description(), request.verificationNote());
    }

    private Jwt jwt(String id, String role) {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(id);
        when(jwt.getClaimAsString("role")).thenReturn(role);
        return jwt;
    }
}
