package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.ContractService;

class SecurePaymentContractControllerTest {
    private static final String ID = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String OFFER = "202fe3fd-626a-41c8-80fd-70af82c1f256";
    private static final String ROOM = "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private ContractService contracts;
    private ContractRepository repository;
    private SecurePaymentContractController controller;

    @BeforeEach
    void setUp() {
        contracts = mock(ContractService.class);
        repository = mock(ContractRepository.class);
        controller = new SecurePaymentContractController(contracts, repository, mock(ChatConversationClient.class));
        Instant now = Instant.parse("2026-10-19T00:00:00Z");
        Contract contract = new Contract(ID, OFFER, ROOM, FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", now.plusSeconds(86400),
                "CREATED", new BigDecimal("20.00"), null, 1, now, now);
        when(repository.findById(ID)).thenReturn(Optional.of(contract));
    }

    @Test
    void traderCreatesDraftWithJwtIdentity() {
        Jwt trader = jwt(TRADER, "TRADER");
        Instant now = Instant.parse("2026-10-19T00:00:00Z");
        Contract created = new Contract(ID, OFFER, ROOM, FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", now.plusSeconds(86400),
                "CREATED", new BigDecimal("20.00"), null, 1, now, now);
        var request = new SecurePaymentContractController.CreateRequest(OFFER, ROOM, FARMER,
                "10000010.00", "2026-10-20T00:00:00Z", "Terms");
        when(contracts.create(OFFER, ROOM, FARMER, TRADER, "10000010.00", "2026-10-20T00:00:00Z", "Terms"))
                .thenReturn(created);

        Contract result = controller.create(request, trader);
        assertEquals("CREATED", result.status());
        verify(contracts).create(OFFER, ROOM, FARMER, TRADER, "10000010.00", "2026-10-20T00:00:00Z", "Terms");
    }

    @Test
    void traderUpdatesDraftWithJwtIdentity() {
        Jwt trader = jwt(TRADER, "TRADER");
        Instant now = Instant.parse("2026-10-19T00:00:00Z");
        Contract updated = new Contract(ID, OFFER, ROOM, FARMER, TRADER,
                new BigDecimal("12000000.00"), "New Terms", now.plusSeconds(86400),
                "CREATED", new BigDecimal("20.00"), null, 2, now, now);
        var request = new SecurePaymentContractController.UpdateRequest("12000000.00", null, "New Terms");
        when(contracts.updateDraft(ID, TRADER, "12000000.00", null, "New Terms")).thenReturn(updated);

        Contract result = controller.updateDraft(ID, request, trader);
        assertEquals(2, result.stateVersion());
        verify(contracts).updateDraft(ID, TRADER, "12000000.00", null, "New Terms");
    }

    @Test
    void farmerAcceptsDraftWithJwtIdentity() {
        Jwt farmer = jwt(FARMER, "FARMER");
        when(contracts.accept(ID, FARMER)).thenReturn(new ContractService.AcceptResult(
                ID, "PENDING_DEPOSIT", "419a5f73-efe3-4a2c-89ed-6e2342d1f865",
                new BigDecimal("5.00"), new BigDecimal("500000.50"), "PENDING"));

        var result = controller.accept(ID, null, farmer);
        assertEquals("PENDING_DEPOSIT", result.status());
        assertEquals("PENDING", result.depositStatus());
        verify(contracts).accept(ID, FARMER);
    }

    @Test
    void wrongRoleIsRejected() {
        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.create(new SecurePaymentContractController.CreateRequest(
                        OFFER, ROOM, FARMER, "100.00", "2026-10-20T00:00:00Z", "Terms"), jwt(FARMER, "FARMER")));
        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.accept(ID, null, jwt(TRADER, "TRADER")));
    }

    private Jwt jwt(String id, String role) {
        Jwt token = mock(Jwt.class);
        when(token.getSubject()).thenReturn(id);
        when(token.getClaimAsString("role")).thenReturn(role);
        return token;
    }
}
