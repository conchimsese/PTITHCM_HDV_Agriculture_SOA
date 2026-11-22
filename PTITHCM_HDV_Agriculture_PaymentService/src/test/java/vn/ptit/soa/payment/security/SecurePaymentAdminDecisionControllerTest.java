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
import vn.ptit.soa.payment.dispute.Dispute;
import vn.ptit.soa.payment.dispute.DisputeReadNotFoundException;
import vn.ptit.soa.payment.dispute.DisputeReadService;
import vn.ptit.soa.payment.dispute.DisputeService;
import vn.ptit.soa.payment.dispute.DisputeSettlementService;

class SecurePaymentAdminDecisionControllerTest {
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String DECISION = "11111111-1111-4111-8111-111111111111";
    private static final String EVIDENCE = "22222222-2222-4222-8222-222222222222";

    @Test
    void noViolationUsesJwtAndSafeClose() {
        DisputeReadService reads = mock(DisputeReadService.class);
        DisputeService disputes = mock(DisputeService.class);
        DisputeSettlementService settlements = mock(DisputeSettlementService.class);
        var controller = new SecurePaymentAdminDecisionController(reads, disputes, settlements);
        var request = new SecurePaymentAdminDecisionController.DecisionRequest(DECISION, 2,
                "NO_VIOLATION", null, null, null, "NONE", "Evidence does not prove breach", List.of());
        when(disputes.closeSafely(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "NO_VIOLATION", "NONE", request.reason(), List.of(), null, null, null))
                .thenReturn(resolved());
        assertEquals("RESOLVED", controller.decide(DISPUTE, DECISION, request,
                jwt(ADMIN, "ADMIN")).status());
        verify(reads).dispute(DISPUTE, ADMIN, true);
        verify(disputes).closeSafely(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "NO_VIOLATION", "NONE", request.reason(), List.of(), null, null, null);
        verify(settlements, never()).settle(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "NO_VIOLATION", "NONE", request.reason(), List.of(), null, null, null);
    }

    @Test
    void farmerViolationUsesSettlementAndEvidence() {
        DisputeSettlementService settlements = mock(DisputeSettlementService.class);
        var controller = new SecurePaymentAdminDecisionController(
                mock(DisputeReadService.class), mock(DisputeService.class), settlements);
        var request = new SecurePaymentAdminDecisionController.DecisionRequest(DECISION, 2,
                "FARMER_VIOLATION", FARMER, "F04", "3.0", "REFUND_TO_TRADER",
                "Wrong delivery", List.of(EVIDENCE));
        when(settlements.settle(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "FARMER_VIOLATION", "REFUND_TO_TRADER", request.reason(),
                List.of(EVIDENCE), FARMER, "F04", "3.0")).thenReturn(resolved());
        assertEquals("RESOLVED", controller.decide(DISPUTE, DECISION, request,
                jwt(ADMIN, "ADMIN")).status());
        verify(settlements).settle(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "FARMER_VIOLATION", "REFUND_TO_TRADER", request.reason(),
                List.of(EVIDENCE), FARMER, "F04", "3.0");
    }

    @Test
    void rejectsNonAdminAndHiddenCaseBeforeDecision() {
        DisputeReadService reads = mock(DisputeReadService.class);
        DisputeService disputes = mock(DisputeService.class);
        var controller = new SecurePaymentAdminDecisionController(reads, disputes,
                mock(DisputeSettlementService.class));
        var request = new SecurePaymentAdminDecisionController.DecisionRequest(DECISION, 2,
                "NO_VIOLATION", null, null, null, "NONE", "No breach", List.of());
        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.decide(DISPUTE, DECISION, request, jwt(FARMER, "FARMER")));
        when(reads.dispute(DISPUTE, ADMIN, true)).thenThrow(new DisputeReadNotFoundException());
        assertThrows(DisputeReadNotFoundException.class,
                () -> controller.decide(DISPUTE, DECISION, request, jwt(ADMIN, "ADMIN")));
        verify(disputes, never()).closeSafely(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "NO_VIOLATION", "NONE", "No breach", List.of(), null, null, null);
    }

    @Test
    void mutualCancellationUsesSeparateSettlementPath() {
        DisputeReadService reads = mock(DisputeReadService.class);
        DisputeSettlementService settlements = mock(DisputeSettlementService.class);
        var controller = new SecurePaymentAdminDecisionController(reads,
                mock(DisputeService.class),
                settlements);
        var request = new SecurePaymentAdminDecisionController.DecisionRequest(DECISION, 2,
                "MUTUAL_CANCEL", null, null, null, "REFUND_TO_TRADER", "Both cancel",
                List.of(EVIDENCE));
        when(settlements.cancelMutually(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "REFUND_TO_TRADER", "Both cancel", List.of(EVIDENCE), null, null, null))
                .thenReturn(resolved());
        assertEquals("RESOLVED", controller.decide(DISPUTE, DECISION, request,
                jwt(ADMIN, "ADMIN")).status());
        verify(reads).dispute(DISPUTE, ADMIN, true);
        verify(settlements).cancelMutually(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "REFUND_TO_TRADER", "Both cancel", List.of(EVIDENCE), null, null, null);
    }

    private Dispute resolved() {
        Instant now = Instant.parse("2026-10-19T00:00:00Z");
        return new Dispute(DISPUTE, "d25c8106-a76f-4480-a747-6f0c7e2a042d", FARMER,
                "DELIVERY", "Wrong goods", "RESOLVED", false, ADMIN, now, now,
                "NO_VIOLATION", 3, 1, now, now);
    }

    private Jwt jwt(String id, String role) {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(id);
        when(jwt.getClaimAsString("role")).thenReturn(role);
        return jwt;
    }
}
