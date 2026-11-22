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
import vn.ptit.soa.payment.dispute.AdminDisputeListService;
import vn.ptit.soa.payment.dispute.Dispute;
import vn.ptit.soa.payment.dispute.DisputeReadNotFoundException;
import vn.ptit.soa.payment.dispute.DisputeReadService;
import vn.ptit.soa.payment.dispute.DisputeService;

class SecurePaymentAdminDisputeControllerTest {
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";

    @Test
    void adminListUsesJwtIdentityAndRejectsFarmer() {
        AdminDisputeListService list = mock(AdminDisputeListService.class);
        var controller = new SecurePaymentAdminDisputeController(list,
                mock(DisputeReadService.class), mock(DisputeService.class));
        var page = new AdminDisputeListService.Page(List.of(dispute()), null);
        when(list.list(ADMIN, "OPEN", null, 20)).thenReturn(page);
        assertEquals(page, controller.list("OPEN", null, 20, jwt(ADMIN, "ADMIN")));
        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.list(null, null, null, jwt(FARMER, "FARMER")));
        verify(list, never()).list(FARMER, null, null, null);
    }

    @Test
    void reviewChecksIndependentAdminBeforeChangingCase() {
        DisputeReadService reads = mock(DisputeReadService.class);
        DisputeService disputes = mock(DisputeService.class);
        var controller = new SecurePaymentAdminDisputeController(
                mock(AdminDisputeListService.class), reads, disputes);
        var request = new SecurePaymentAdminDisputeController.ReviewRequest("Will investigate", 1L);
        when(disputes.review(DISPUTE, ADMIN, "Will investigate", 1L)).thenReturn(dispute());
        assertEquals(DISPUTE, controller.review(DISPUTE, request, jwt(ADMIN, "ADMIN")).disputeId());
        verify(reads).dispute(DISPUTE, ADMIN, true);
        verify(disputes).review(DISPUTE, ADMIN, "Will investigate", 1L);
    }

    @Test
    void hiddenCaseCannotBeClaimed() {
        DisputeReadService reads = mock(DisputeReadService.class);
        DisputeService disputes = mock(DisputeService.class);
        var controller = new SecurePaymentAdminDisputeController(
                mock(AdminDisputeListService.class), reads, disputes);
        when(reads.dispute(DISPUTE, ADMIN, true)).thenThrow(new DisputeReadNotFoundException());
        assertThrows(DisputeReadNotFoundException.class,
                () -> controller.review(DISPUTE,
                        new SecurePaymentAdminDisputeController.ReviewRequest("note", null),
                        jwt(ADMIN, "ADMIN")));
        verify(disputes, never()).review(DISPUTE, ADMIN, "note", null);
    }

    private Dispute dispute() {
        Instant now = Instant.parse("2026-10-19T00:00:00Z");
        return new Dispute(DISPUTE, CONTRACT, FARMER, "DELIVERY", "Wrong goods",
                "OPEN", true, null, null, null, null, 1, 0, now, now);
    }

    private Jwt jwt(String id, String role) {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(id);
        when(jwt.getClaimAsString("role")).thenReturn(role);
        return jwt;
    }
}
