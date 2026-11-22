package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.dispute.Dispute;
import vn.ptit.soa.payment.dispute.DisputeReadNotFoundException;
import vn.ptit.soa.payment.dispute.DisputeReadService;
import vn.ptit.soa.payment.dispute.DisputeRepository;
import vn.ptit.soa.payment.dispute.DisputeResponse;
import vn.ptit.soa.payment.dispute.DisputeResponseService;
import vn.ptit.soa.payment.dispute.DisputeService;

class SecurePaymentDisputeControllerTest {
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final Instant NOW = Instant.parse("2026-10-19T00:00:00Z");
    private ContractRepository contracts;
    private DisputeRepository disputes;
    private DisputeService service;
    private DisputeReadService reads;
    private DisputeResponseService responses;
    private SecurePaymentDisputeController controller;

    @BeforeEach
    void setUp() {
        contracts = mock(ContractRepository.class);
        disputes = mock(DisputeRepository.class);
        service = mock(DisputeService.class);
        reads = mock(DisputeReadService.class);
        responses = mock(DisputeResponseService.class);
        controller = new SecurePaymentDisputeController(contracts, disputes, service, reads, responses);
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(new Contract(CONTRACT,
                "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0", FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", NOW.plusSeconds(86400),
                "ACTIVE", new BigDecimal("20.00"), null, 3, NOW, NOW)));
        when(disputes.findById(DISPUTE)).thenReturn(Optional.of(new Dispute(DISPUTE,
                CONTRACT, FARMER, "DELIVERY", "Details", "OPEN", true,
                null, null, null, null, 1, 0, NOW, NOW)));
    }

    @Test
    void opensUsingJwtIdentityAndRejectsUnrelatedAccount() {
        var request = new SecurePaymentDisputeController.OpenRequest("DELIVERY", "Wrong goods", List.of());
        when(service.open(CONTRACT, FARMER, "DELIVERY", "Wrong goods", List.of()))
                .thenReturn(new Dispute(DISPUTE, CONTRACT, FARMER, "DELIVERY", "Wrong goods",
                        "OPEN", true, null, null, null, null, 1, 0, NOW, NOW));
        assertEquals(DISPUTE, controller.open(CONTRACT, request, jwt(FARMER, "FARMER")).disputeId());
        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.open(CONTRACT, request, jwt(TRADER, "FARMER")));
        verify(service, never()).open(CONTRACT, TRADER, "DELIVERY", "Wrong goods", List.of());
    }

    @Test
    void adminMayReadButCannotRespondAsParticipant() {
        controller.find(DISPUTE, jwt(ADMIN, "ADMIN"));
        verify(reads).dispute(DISPUTE, ADMIN, true);
        var request = new SecurePaymentDisputeController.ResponseRequest("My account", List.of());
        assertThrows(DisputeReadNotFoundException.class,
                () -> controller.respond(DISPUTE, request, jwt(ADMIN, "ADMIN")));
    }

    @Test
    void participantResponseUsesJwtAccount() {
        var request = new SecurePaymentDisputeController.ResponseRequest("We can fix it", List.of());
        when(responses.respond(DISPUTE, TRADER, "We can fix it", List.of()))
                .thenReturn(new DisputeResponse("11111111-1111-4111-8111-111111111111",
                        DISPUTE, TRADER, "We can fix it", List.of(), NOW));
        assertEquals(TRADER, controller.respond(DISPUTE, request, jwt(TRADER, "TRADER")).accountId());
        verify(responses).respond(DISPUTE, TRADER, "We can fix it", List.of());
    }

    private Jwt jwt(String id, String role) {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(id);
        when(jwt.getClaimAsString("role")).thenReturn(role);
        return jwt;
    }
}
