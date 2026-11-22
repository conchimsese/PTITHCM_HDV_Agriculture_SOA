package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;

class DecisionReversalServiceTest {
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String ORIGINAL = "11111111-1111-4111-8111-111111111111";
    private static final String REVERSAL = "22222222-2222-4222-8222-222222222222";
    private static final String EVIDENCE = "33333333-3333-4333-8333-333333333333";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String ADMIN1 = "00000000-0000-0000-0000-000000000001";
    private static final String ADMIN2 = "00000000-0000-0000-0000-000000000002";
    private static final Instant NOW = Instant.parse("2026-10-20T00:00:00Z");
    private DisputeRepository disputes;
    private DecisionReversalRepository reversals;
    private DisputeEvidenceRepository evidence;
    private DecisionReversalService service;
    private ReputationDecisionOutboxRepository reputationOutbox;

    @BeforeEach
    void setUp() {
        disputes = mock(DisputeRepository.class);
        reversals = mock(DecisionReversalRepository.class);
        evidence = mock(DisputeEvidenceRepository.class);
        ContractRepository contracts = mock(ContractRepository.class);
        reputationOutbox = mock(ReputationDecisionOutboxRepository.class);
        service = new DecisionReversalService(disputes, reversals, evidence, contracts,
                reputationOutbox, Clock.fixed(NOW, ZoneOffset.UTC));
        DisputeDecision original = new DisputeDecision(ORIGINAL, DISPUTE, ADMIN1, 2,
                "FARMER_VIOLATION", "REFUND_TO_TRADER", "Prior reason", List.of(EVIDENCE));
        Dispute dispute = new Dispute(DISPUTE, CONTRACT, FARMER, "DELIVERY", "Details",
                "RESOLVED", false, ADMIN1, NOW, NOW, "FARMER_VIOLATION",
                3, 1, NOW, NOW);
        when(disputes.findDecision(ORIGINAL)).thenReturn(Optional.of(original));
        when(disputes.findById(DISPUTE)).thenReturn(Optional.of(dispute));
        when(disputes.findByIdForUpdate(DISPUTE)).thenReturn(Optional.of(dispute));
        when(contracts.findByIdForUpdate(CONTRACT)).thenReturn(Optional.of(new Contract(
                CONTRACT, CONTRACT, CONTRACT, FARMER, TRADER, BigDecimal.TEN, "terms",
                NOW, "CANCELLED", new BigDecimal("20.00"), null, 4, NOW, NOW)));
        when(evidence.belongsToDispute(EVIDENCE, DISPUTE)).thenReturn(true);
    }

    @Test
    void independentAdminAppendsReversalWithoutChangingMoneyState() {
        var result = service.reverse(ORIGINAL, REVERSAL, ADMIN2, "Corrected after review",
                List.of(EVIDENCE));
        assertEquals(ORIGINAL, result.originalDecisionId());
        assertEquals(ADMIN2, result.adminId());
        verify(reversals).insert(result);
        verify(disputes).recordReversal(DISPUTE, 1, NOW);
        verify(reputationOutbox).reversePenalty(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq(result), org.mockito.ArgumentMatchers.eq(2L));
    }

    @Test
    void originalAdminAndMissingEvidenceCannotReverse() {
        assertThrows(DecisionReversalForbiddenException.class, () -> service.reverse(
                ORIGINAL, REVERSAL, ADMIN1, "Corrected", List.of(EVIDENCE)));
        assertThrows(IllegalArgumentException.class, () -> service.reverse(
                ORIGINAL, REVERSAL, ADMIN2, "Corrected", List.of()));
        verify(disputes, never()).recordReversal(DISPUTE, 1, NOW);
        org.mockito.Mockito.verifyNoInteractions(reputationOutbox);
    }

    @Test
    void exactRetryReturnsExistingAndChangedPayloadConflicts() {
        var existing = new DecisionReversal(REVERSAL, ORIGINAL, DISPUTE, ADMIN2,
                "Corrected", List.of(EVIDENCE), NOW);
        when(reversals.findByOriginal(ORIGINAL)).thenReturn(Optional.of(existing));
        assertEquals(existing, service.reverse(ORIGINAL, REVERSAL, ADMIN2,
                "Corrected", List.of(EVIDENCE)));
        assertThrows(IllegalStateException.class, () -> service.reverse(ORIGINAL, REVERSAL,
                ADMIN2, "Different", List.of(EVIDENCE)));
        verify(disputes, never()).recordReversal(DISPUTE, 1, NOW);
        org.mockito.Mockito.verifyNoInteractions(reputationOutbox);
    }
}
