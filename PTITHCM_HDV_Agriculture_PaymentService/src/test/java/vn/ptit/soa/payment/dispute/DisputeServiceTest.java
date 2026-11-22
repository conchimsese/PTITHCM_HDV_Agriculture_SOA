package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
import vn.ptit.soa.payment.contract.PaymentTracking;
import vn.ptit.soa.payment.contract.PaymentTrackingRepository;

class DisputeServiceTest {
    private static final String CONTRACT_ID = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    private DisputeRepository disputes;
    private ContractRepository contracts;
    private PaymentTrackingRepository tracking;
    private DisputeService service;
    private DisputeEvidenceRepository evidence;

    @BeforeEach
    void setUp() {
        disputes = mock(DisputeRepository.class);
        contracts = mock(ContractRepository.class);
        tracking = mock(PaymentTrackingRepository.class);
        evidence = mock(DisputeEvidenceRepository.class);
        service = new DisputeService(disputes, contracts, tracking,
                Clock.fixed(NOW, ZoneOffset.UTC), evidence);
        Contract contract = new Contract(CONTRACT_ID,
                "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0", FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", NOW.plusSeconds(86400),
                "ACTIVE", new BigDecimal("20.00"), null, 3, NOW, NOW);
        when(contracts.findByIdForUpdate(CONTRACT_ID)).thenReturn(Optional.of(contract));
    }

    @Test
    void activeMoneyIsHeldWhenDisputeOpens() {
        when(tracking.findByContractIdForUpdate(CONTRACT_ID))
                .thenReturn(Optional.of(deposit("RELEASABLE")));
        Dispute dispute = service.open(CONTRACT_ID, FARMER, "DELIVERY", "Wrong quantity", List.of());
        assertTrue(dispute.depositHold());
        verify(tracking).setDisputeHold(CONTRACT_ID, true, NOW);
        verify(disputes).insert(dispute);
    }

    @Test
    void lateDisputeNeverReopensReleasedMoney() {
        when(tracking.findByContractIdForUpdate(CONTRACT_ID))
                .thenReturn(Optional.of(deposit("RELEASED")));
        Dispute dispute = service.open(CONTRACT_ID, TRADER, "LATE", "Late complaint", List.of());
        assertFalse(dispute.depositHold());
        verify(tracking, never()).setDisputeHold(CONTRACT_ID, true, NOW);
        verify(disputes).insert(dispute);
    }

    @Test
    void unsupportedPenaltyOrUnverifiedEvidenceCannotBeDecided() {
        String disputeId = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
        String decisionId = "abb74c4e-35be-4c63-a671-663a54b3b4df";
        String admin = "00000000-0000-0000-0000-000000000001";
        assertThrows(IllegalArgumentException.class, () -> service.closeSafely(
                disputeId, decisionId, decisionId, admin, 2, "TRADER_VIOLATION",
                "FORFEIT_TO_FARMER", "Not supported", List.of(), TRADER, "T01", "1"));
        assertThrows(IllegalArgumentException.class, () -> service.closeSafely(
                disputeId, decisionId, decisionId, admin, 2, "NO_VIOLATION",
                "NONE", "Check", List.of("unverified-evidence"), null, null, null));
        verifyNoInteractions(disputes, tracking);
    }

    @Test
    void adminEvidenceSourceMustBeContractParticipant() {
        Contract contract = contracts.findByIdForUpdate(CONTRACT_ID).orElseThrow();
        when(contracts.findById(CONTRACT_ID)).thenReturn(Optional.of(contract));
        Dispute dispute = new Dispute("419a5f73-efe3-4a2c-89ed-6e2342d1f865",
                CONTRACT_ID, FARMER, "DELIVERY", "Details", "OPEN", true,
                null, null, null, null, 1, 0, NOW, NOW);
        assertTrue(FARMER.equals(service.requireEvidenceSource(dispute, FARMER)));
        assertThrows(IllegalArgumentException.class,
                () -> service.requireEvidenceSource(dispute,
                        "00000000-0000-0000-0000-000000000001"));
    }

    private PaymentTracking deposit(String status) {
        return new PaymentTracking("e99f11f1-018b-4e7e-b267-c4def2e8505b", CONTRACT_ID,
                new BigDecimal("5.00"), new BigDecimal("500001.00"), status, NOW,
                NOW.plusSeconds(86400), null, NOW, "RELEASED".equals(status) ? NOW : null,
                false, 2, NOW, NOW);
    }
}
