package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.PaymentTracking;
import vn.ptit.soa.payment.contract.PaymentTrackingRepository;

class AdminDisputeFilingServiceTest {
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final String OUTSIDER = "00000000-0000-0000-0000-000000000002";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    private final ContractRepository contracts = mock(ContractRepository.class);
    private final PaymentTrackingRepository tracking = mock(PaymentTrackingRepository.class);
    private final DisputeRepository disputes = mock(DisputeRepository.class);
    private final AdminDisputeFilingRepository filings = mock(AdminDisputeFilingRepository.class);
    private final AdminDisputeFilingService service = new AdminDisputeFilingService(
            contracts, tracking, disputes, filings, Clock.fixed(NOW, ZoneOffset.UTC));

    @BeforeEach
    void setUp() {
        when(contracts.findByIdForUpdate(CONTRACT)).thenReturn(Optional.of(contract()));
        when(tracking.findByContractIdForUpdate(CONTRACT))
                .thenReturn(Optional.of(deposit("LOCKED")));
    }

    @Test
    void adminFilingKeepsDepositHeldAndRecordsRealActor() {
        Dispute opened = service.open(CONTRACT, ADMIN, FARMER,
                "DELIVERY", "Missing bags", "Verified through registered email");
        assertTrue(opened.depositHold());
        verify(tracking).setDisputeHold(CONTRACT, true, NOW);
        verify(disputes).insert(opened);
        verify(filings).insert(opened.disputeId(), ADMIN, FARMER,
                "Verified through registered email", NOW);
    }

    @Test
    void lateComplaintDoesNotReopenReleasedDeposit() {
        when(tracking.findByContractIdForUpdate(CONTRACT))
                .thenReturn(Optional.of(deposit("RELEASED")));
        Dispute opened = service.open(CONTRACT, ADMIN, TRADER,
                "LATE", "Complaint after release", "Verified through registered email");
        assertFalse(opened.depositHold());
        verify(tracking, never()).setDisputeHold(CONTRACT, true, NOW);
        verify(filings).insert(opened.disputeId(), ADMIN, TRADER,
                "Verified through registered email", NOW);
    }

    @Test
    void rejectsOwnContractWrongRepresentativeAndDuplicateActiveCase() {
        assertThrows(IllegalArgumentException.class,
                () -> service.open(CONTRACT, FARMER, TRADER, "DELIVERY", "Details", "Verified"));
        assertThrows(IllegalArgumentException.class,
                () -> service.open(CONTRACT, ADMIN, OUTSIDER, "DELIVERY", "Details", "Verified"));
        when(disputes.activeExists(CONTRACT)).thenReturn(true);
        assertThrows(IllegalStateException.class,
                () -> service.open(CONTRACT, ADMIN, FARMER, "DELIVERY", "Details", "Verified"));
        verifyNoInteractions(filings);
    }

    private Contract contract() {
        return new Contract(CONTRACT, CONTRACT, CONTRACT, FARMER, TRADER,
                BigDecimal.TEN, "terms", NOW, "ACTIVE", new BigDecimal("20.00"),
                null, 3, NOW, NOW);
    }

    private PaymentTracking deposit(String status) {
        return new PaymentTracking(CONTRACT, CONTRACT, new BigDecimal("5.00"),
                BigDecimal.ONE, status, NOW, NOW, null, null,
                "RELEASED".equals(status) ? NOW : null, false, 2, NOW, NOW);
    }
}
