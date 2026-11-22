package vn.ptit.soa.payment.contract;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DepositServiceTest {
    private static final String CONTRACT_ID = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String TRACKING = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private ContractRepository contracts;
    private PaymentTrackingRepository tracking;
    private TradingDepositClient trading;
    private DepositFinalizer finalizer;
    private DepositService service;
    private Contract contract;
    private PaymentTracking deposit;

    @BeforeEach
    void setUp() {
        contracts = mock(ContractRepository.class);
        tracking = mock(PaymentTrackingRepository.class);
        trading = mock(TradingDepositClient.class);
        finalizer = mock(DepositFinalizer.class);
        service = new DepositService(contracts, tracking, trading, finalizer);
        Instant now = Instant.now();
        contract = new Contract(CONTRACT_ID, "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0",
                "233196d7-d149-451d-8006-91e6563be4f0", TRADER,
                new BigDecimal("10000010.00"), "Terms", now.plusSeconds(86400),
                "PENDING_DEPOSIT", new BigDecimal("20.00"), null, 2, now, now);
        deposit = new PaymentTracking(TRACKING, CONTRACT_ID, new BigDecimal("5.00"),
                new BigDecimal("500001.00"), "PENDING", null, now.plusSeconds(86400),
                null, null, null, false, 1, now, now);
        when(contracts.findById(CONTRACT_ID)).thenReturn(Optional.of(contract));
        when(tracking.findByContractId(CONTRACT_ID)).thenReturn(Optional.of(deposit));
    }

    @Test
    void onlyFinalizesAfterTradingConfirms() {
        DepositFinalizer.PayResult expected = new DepositFinalizer.PayResult(
                TRACKING, CONTRACT_ID, deposit.depositAmount(), "LOCKED", "ACTIVE", true);
        when(finalizer.finish(CONTRACT_ID, TRADER, TRACKING)).thenReturn(expected);
        assertEquals(expected, service.pay(CONTRACT_ID, TRADER));
        verify(trading).commit(contract, deposit);
        verify(finalizer).finish(CONTRACT_ID, TRADER, TRACKING);
    }

    @Test
    void unknownTradingOutcomeCannotFinalize() {
        org.mockito.Mockito.doThrow(new TradingDepositClient.TradingUnavailableException("unknown"))
                .when(trading).commit(contract, deposit);
        assertThrows(TradingDepositClient.TradingUnavailableException.class,
                () -> service.pay(CONTRACT_ID, TRADER));
        verifyNoInteractions(finalizer);
    }

    @Test
    void rejectsOtherTraderBeforeCallingTrading() {
        assertThrows(IllegalArgumentException.class,
                () -> service.pay(CONTRACT_ID, "00000000-0000-0000-0000-000000000000"));
        verifyNoInteractions(trading, finalizer);
        verify(tracking, never()).findByContractId(CONTRACT_ID);
    }
}
