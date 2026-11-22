package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
import vn.ptit.soa.payment.contract.DepositFinalizer;
import vn.ptit.soa.payment.contract.DepositLifecycleService;
import vn.ptit.soa.payment.contract.DepositService;

class SecurePaymentActionControllerTest {
    private static final String ID = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private ContractRepository contracts;
    private DepositLifecycleService lifecycle;
    private DepositService deposits;
    private SecurePaymentActionController controller;

    @BeforeEach
    void setUp() {
        contracts = mock(ContractRepository.class);
        lifecycle = mock(DepositLifecycleService.class);
        deposits = mock(DepositService.class);
        controller = new SecurePaymentActionController(contracts, lifecycle, deposits);
        Instant now = Instant.parse("2026-10-19T00:00:00Z");
        Contract contract = new Contract(ID, "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0", FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", now.plusSeconds(86400),
                "ACTIVE", new BigDecimal("20.00"), null, 3, now, now);
        when(contracts.findById(ID)).thenReturn(Optional.of(contract));
    }

    @Test
    void traderCompletesWithIdentityFromJwtAndNoClientBody() {
        Jwt trader = jwt(TRADER, "TRADER");
        when(lifecycle.complete(ID, TRADER)).thenReturn(new DepositLifecycleService.CompleteResult(
                ID, "COMPLETED", "419a5f73-efe3-4a2c-89ed-6e2342d1f865", "RELEASABLE",
                Instant.parse("2026-10-19T00:00:00Z")));
        var result = controller.complete(ID, null, trader);
        assertEquals("COMPLETED", result.status());
        assertEquals("RELEASABLE", result.depositStatus());
        verify(lifecycle).complete(ID, TRADER);
    }

    @Test
    void farmerReleasesAndTraderCannotBorrowFarmerRole() {
        Jwt farmer = jwt(FARMER, "FARMER");
        when(lifecycle.release(ID, FARMER)).thenReturn(new DepositLifecycleService.ReleaseResult(
                "419a5f73-efe3-4a2c-89ed-6e2342d1f865", ID,
                new BigDecimal("500001.00"), "RELEASED", "COMPLETED",
                Instant.parse("2026-10-19T00:00:00Z"), true));
        assertEquals("RELEASED", controller.release(ID, null, farmer).status());
        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.release(ID, null, jwt(TRADER, "TRADER")));
        assertThrows(PaymentActionForbiddenException.class,
                () -> controller.release(ID, null, jwt("f3a1b6aa-3456-4bea-a121-06d596aadad1", "FARMER")));
        verify(lifecycle).release(ID, FARMER);
    }

    @Test
    void bodyCannotProvideActorOrPaymentState() {
        String forged = "{\"traderId\":\"" + TRADER + "\"}";
        assertThrows(IllegalArgumentException.class,
                () -> controller.complete(ID, forged, jwt(TRADER, "TRADER")));
        verify(lifecycle, never()).complete(ID, TRADER);
    }

    @Test
    void traderPaysDepositWithJwtIdentity() {
        Jwt trader = jwt(TRADER, "TRADER");
        when(deposits.pay(ID, TRADER)).thenReturn(new DepositFinalizer.PayResult(
                "419a5f73-efe3-4a2c-89ed-6e2342d1f865", ID, new BigDecimal("500000.50"),
                "LOCKED", "ACTIVE", true));
        var result = controller.pay(ID, null, trader);
        assertEquals("ACTIVE", result.contractStatus());
        assertEquals("LOCKED", result.status());
        verify(deposits).pay(ID, TRADER);
    }

    private Jwt jwt(String id, String role) {
        Jwt token = mock(Jwt.class);
        when(token.getSubject()).thenReturn(id);
        when(token.getClaimAsString("role")).thenReturn(role);
        return token;
    }
}
