package vn.ptit.soa.payment.contract;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DepositServiceListTest {
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String OUTSIDER = "00000000-0000-0000-0000-000000000001";
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    private final ContractRepository contracts = mock(ContractRepository.class);
    private final PaymentTrackingRepository tracking = mock(PaymentTrackingRepository.class);
    private final DepositService service = new DepositService(contracts, tracking,
            mock(TradingDepositClient.class), mock(DepositFinalizer.class));

    @Test
    void cursorContinuesAfterLastVisibleDeposit() {
        PaymentTracking first = deposit("abb74c4e-35be-4c63-a671-663a54b3b4df", NOW);
        PaymentTracking second = deposit("419a5f73-efe3-4a2c-89ed-6e2342d1f865", NOW.minusSeconds(1));
        when(tracking.findForParticipant(FARMER, "LOCKED", null, null, 2))
                .thenReturn(List.of(first, second));
        DepositService.DepositPage page = service.list(FARMER, "LOCKED", null, 1);
        assertEquals(List.of(first), page.data());
        assertNotNull(page.nextCursor());

        when(tracking.findForParticipant(FARMER, "LOCKED", NOW,
                first.paymentTrackingId(), 2)).thenReturn(List.of(second));
        DepositService.DepositPage next = service.list(FARMER, "LOCKED", page.nextCursor(), 1);
        assertEquals(List.of(second), next.data());
        assertNull(next.nextCursor());
        verify(tracking).findForParticipant(FARMER, "LOCKED", NOW,
                first.paymentTrackingId(), 2);
    }

    @Test
    void rejectsInvalidCursorFilterAndLimit() {
        assertThrows(IllegalArgumentException.class,
                () -> service.list(FARMER, null, "bad cursor", 20));
        assertThrows(IllegalArgumentException.class,
                () -> service.list(FARMER, "UNKNOWN", null, 20));
        assertThrows(IllegalArgumentException.class,
                () -> service.list(FARMER, null, null, 101));
        verifyNoInteractions(tracking);
    }

    @Test
    void detailRequiresContractParticipant() {
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(new Contract(CONTRACT,
                CONTRACT, CONTRACT, FARMER, TRADER, BigDecimal.ONE, "terms", NOW,
                "ACTIVE", BigDecimal.ZERO, null, 1, NOW, NOW)));
        assertThrows(DepositNotFoundException.class, () -> service.find(CONTRACT, OUTSIDER));
        verifyNoInteractions(tracking);

        PaymentTracking item = deposit("abb74c4e-35be-4c63-a671-663a54b3b4df", NOW);
        when(tracking.findByContractId(CONTRACT)).thenReturn(Optional.of(item));
        assertEquals(item, service.find(CONTRACT, FARMER));
    }

    private PaymentTracking deposit(String id, Instant createdAt) {
        return new PaymentTracking(id, CONTRACT, new BigDecimal("5.00"),
                new BigDecimal("50000.00"), "LOCKED", createdAt, NOW,
                null, null, null, false, 1, createdAt, createdAt);
    }
}
