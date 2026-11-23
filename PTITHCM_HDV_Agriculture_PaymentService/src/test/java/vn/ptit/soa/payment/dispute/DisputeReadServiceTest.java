package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;

class DisputeReadServiceTest {
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    private final ContractRepository contracts = mock(ContractRepository.class);
    private final DisputeRepository disputes = mock(DisputeRepository.class);
    private final AdminDisputeFilingRepository filings = mock(AdminDisputeFilingRepository.class);
    private final DecisionReversalRepository reversals = mock(DecisionReversalRepository.class);
    private final DisputeReadService reads = new DisputeReadService(contracts, disputes, filings, reversals);

    @BeforeEach
    void setUp() {
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(new Contract(CONTRACT,
                CONTRACT, CONTRACT, FARMER, TRADER, BigDecimal.TEN, "terms", NOW,
                "COMPLETED", new BigDecimal("20.00"), NOW, 3, NOW, NOW)));
    }

    @Test
    void contractExposesLatestDisputeOnlyToParticipant() {
        when(disputes.findLatestForContract(CONTRACT)).thenReturn(Optional.of(dispute()));
        var detail = reads.contract(CONTRACT, FARMER);
        assertEquals(DISPUTE, detail.disputeSummary().disputeId());
        assertEquals("RESOLVED", detail.disputeSummary().status());
        assertThrows(DisputeReadNotFoundException.class,
                () -> reads.contract(CONTRACT, ADMIN));
    }

    @Test
    void disputeExposesRecordedDecisionToParticipantOrIndependentAdmin() {
        when(disputes.findById(DISPUTE)).thenReturn(Optional.of(dispute()));
        DisputeDecision decision = new DisputeDecision(ADMIN, DISPUTE, ADMIN, 2,
                "NO_VIOLATION", "NONE", "checked", List.of());
        when(disputes.findDecisionForDispute(DISPUTE)).thenReturn(Optional.of(decision));
        AdminDisputeFilingRepository.Filing filing = new AdminDisputeFilingRepository.Filing(
                DISPUTE, ADMIN, FARMER, "Verified registered email", NOW);
        when(filings.find(DISPUTE)).thenReturn(Optional.of(filing));
        DecisionReversal reversal = new DecisionReversal("11111111-1111-4111-8111-111111111111",
                ADMIN, DISPUTE, "22222222-2222-4222-8222-222222222222",
                "Corrected", List.of(), NOW);
        when(reversals.findByDispute(DISPUTE)).thenReturn(Optional.of(reversal));
        assertEquals(decision, reads.dispute(DISPUTE, TRADER, false).decision());
        assertEquals(FARMER, reads.dispute(DISPUTE, ADMIN, true).farmerId());
        assertEquals(TRADER, reads.dispute(DISPUTE, ADMIN, true).traderId());
        assertEquals(reversal, reads.dispute(DISPUTE, TRADER, false).reversal());
        assertEquals(decision, reads.dispute(DISPUTE, ADMIN, true).decision());
        assertNull(reads.dispute(DISPUTE, TRADER, false).adminFiling());
        assertEquals(filing, reads.dispute(DISPUTE, ADMIN, true).adminFiling());
        assertThrows(DisputeReadNotFoundException.class,
                () -> reads.dispute(DISPUTE, ADMIN, false));
        assertThrows(DisputeReadNotFoundException.class,
                () -> reads.dispute(DISPUTE, FARMER, true));
    }

    @Test
    void contractWithoutDisputeHasNullSummary() {
        assertNull(reads.contract(CONTRACT, FARMER).disputeSummary());
    }

    private Dispute dispute() {
        return new Dispute(DISPUTE, CONTRACT, FARMER, "DELIVERY", "details", "RESOLVED",
                false, ADMIN, NOW, NOW, "NO_VIOLATION", 3, 1, NOW, NOW);
    }
}
