package vn.ptit.soa.payment.contract;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.ptit.soa.payment.dispute.DisputeRepository;

class DepositLifecycleServiceTest {
    private static final String CONTRACT_ID = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String TRACKING = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    private ContractRepository contracts;
    private PaymentTrackingRepository tracking;
    private ContractOutboxRepository contractOutbox;
    private DepositOutboxRepository depositOutbox;
    private DepositLifecycleService service;
    private DisputeRepository disputes;

    @BeforeEach
    void setUp() {
        contracts = mock(ContractRepository.class);
        tracking = mock(PaymentTrackingRepository.class);
        contractOutbox = mock(ContractOutboxRepository.class);
        depositOutbox = mock(DepositOutboxRepository.class);
        disputes = mock(DisputeRepository.class);
        service = new DepositLifecycleService(contracts, tracking, contractOutbox,
                depositOutbox, Clock.fixed(NOW, ZoneOffset.UTC), disputes);
    }

    @Test
    void refusesEarlyOrHeldReleaseWithoutWriting() {
        when(contracts.findByIdForUpdate(CONTRACT_ID)).thenReturn(Optional.of(contract("ACTIVE", null)));
        when(tracking.findByContractIdForUpdate(CONTRACT_ID))
                .thenReturn(Optional.of(deposit("LOCKED", NOW.plusSeconds(86400), false, null)));
        assertThrows(IllegalStateException.class, () -> service.release(CONTRACT_ID, FARMER));
        verify(tracking, never()).markReleasable(eq(CONTRACT_ID), anyLong(), any(), any(), any());

        when(tracking.findByContractIdForUpdate(CONTRACT_ID))
                .thenReturn(Optional.of(deposit("RELEASABLE", NOW.minusSeconds(86400), true, NOW)));
        assertThrows(IllegalStateException.class, () -> service.release(CONTRACT_ID, FARMER));
        verify(tracking, never()).markReleased(eq(CONTRACT_ID), anyLong(), any());
    }

    @Test
    void dueReleasePromotesThenPaysOnce() {
        Contract contract = contract("ACTIVE", null);
        PaymentTracking due = deposit("LOCKED", NOW.minusSeconds(90000), false, null);
        PaymentTracking eligible = deposit("RELEASABLE", due.deliveryDate(), false,
                due.deliveryDate().plusSeconds(86400));
        PaymentTracking released = deposit("RELEASED", due.deliveryDate(), false,
                due.deliveryDate().plusSeconds(86400));
        when(contracts.findByIdForUpdate(CONTRACT_ID)).thenReturn(Optional.of(contract));
        when(tracking.findByContractIdForUpdate(CONTRACT_ID)).thenReturn(Optional.of(due));
        when(tracking.findByContractId(CONTRACT_ID))
                .thenReturn(Optional.of(eligible), Optional.of(released));

        DepositLifecycleService.ReleaseResult result = service.release(CONTRACT_ID, FARMER);
        assertEquals("RELEASED", result.status());
        assertTrue(result.simulated());
        verify(tracking).markReleasable(eq(CONTRACT_ID), eq(2L), eq(eligible.releaseAt()),
                eq(null), eq(NOW));
        verify(tracking).markReleased(CONTRACT_ID, eligible.stateVersion() + 1, NOW);
        verify(depositOutbox).statusChanged(contract, eligible, "LOCKED", null, NOW);
        verify(depositOutbox).statusChanged(contract, released, "RELEASABLE", FARMER, NOW);

        when(tracking.findByContractIdForUpdate(CONTRACT_ID)).thenReturn(Optional.of(released));
        assertEquals("RELEASED", service.release(CONTRACT_ID, FARMER).status());
        verify(tracking).markReleased(CONTRACT_ID, eligible.stateVersion() + 1, NOW);
    }

    @Test
    void completionAfterTimedReleaseKeepsMoneyReleased() {
        Contract active = contract("ACTIVE", null);
        Contract completed = contract("COMPLETED", NOW);
        PaymentTracking released = deposit("RELEASED", NOW.minusSeconds(90000), false,
                NOW.minusSeconds(3600));
        when(contracts.findByIdForUpdate(CONTRACT_ID)).thenReturn(Optional.of(active));
        when(tracking.findByContractIdForUpdate(CONTRACT_ID)).thenReturn(Optional.of(released));
        when(contracts.findById(CONTRACT_ID)).thenReturn(Optional.of(completed));
        when(tracking.findByContractId(CONTRACT_ID)).thenReturn(Optional.of(released));

        DepositLifecycleService.CompleteResult result = service.complete(CONTRACT_ID, TRADER);
        assertEquals("COMPLETED", result.status());
        assertEquals("RELEASED", result.depositStatus());
        verify(tracking).markCompletedAfterEligible(CONTRACT_ID, released.stateVersion() + 1, NOW);
        verify(tracking, never()).markReleasable(eq(CONTRACT_ID), anyLong(), any(), any(), any());
        verify(depositOutbox, never()).statusChanged(any(), any(), any(), any(), any());
    }

    @Test
    void lateActiveDisputeBlocksCompletionEvenWithoutDepositHold() {
        when(contracts.findByIdForUpdate(CONTRACT_ID)).thenReturn(Optional.of(contract("ACTIVE", null)));
        when(tracking.findByContractIdForUpdate(CONTRACT_ID))
                .thenReturn(Optional.of(deposit("RELEASED", NOW.minusSeconds(90000), false,
                        NOW.minusSeconds(3600))));
        when(disputes.activeExists(CONTRACT_ID)).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.complete(CONTRACT_ID, TRADER));
        verify(contracts, never()).markCompleted(eq(CONTRACT_ID), anyLong(), any());
    }

    private Contract contract(String status, Instant completedAt) {
        return new Contract(CONTRACT_ID, "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0", FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", NOW.plusSeconds(86400), status,
                new BigDecimal("20.00"), completedAt, 3, NOW, NOW);
    }

    private PaymentTracking deposit(String status, Instant deliveryAt, boolean hold, Instant releaseAt) {
        return new PaymentTracking(TRACKING, CONTRACT_ID, new BigDecimal("5.00"),
                new BigDecimal("500001.00"), status, NOW.minusSeconds(1000), deliveryAt,
                null, releaseAt, "RELEASED".equals(status) ? NOW : null,
                hold, "LOCKED".equals(status) ? 1 : 2, NOW, NOW);
    }
}
