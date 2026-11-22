package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
import vn.ptit.soa.payment.contract.ContractOutboxRepository;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.DepositOutboxRepository;
import vn.ptit.soa.payment.contract.PaymentTracking;
import vn.ptit.soa.payment.contract.PaymentTrackingRepository;

class AdminCompletionServiceTest {
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String EVIDENCE = "abb74c4e-35be-4c63-a671-663a54b3b4df";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    private final ContractRepository contracts = mock(ContractRepository.class);
    private final PaymentTrackingRepository tracking = mock(PaymentTrackingRepository.class);
    private final DisputeRepository disputes = mock(DisputeRepository.class);
    private final DisputeEvidenceRepository evidence = mock(DisputeEvidenceRepository.class);
    private final AdminCompletionRepository audit = mock(AdminCompletionRepository.class);
    private final ContractOutboxRepository contractOutbox = mock(ContractOutboxRepository.class);
    private final DepositOutboxRepository depositOutbox = mock(DepositOutboxRepository.class);
    private final AdminCompletionService service = new AdminCompletionService(contracts, tracking,
            disputes, evidence, audit, contractOutbox, depositOutbox,
            Clock.fixed(NOW, ZoneOffset.UTC));

    @BeforeEach
    void setUp() {
        when(contracts.findByIdForUpdate(CONTRACT)).thenReturn(Optional.of(contract("ACTIVE", 3)));
        when(tracking.findByContractIdForUpdate(CONTRACT)).thenReturn(Optional.of(deposit("LOCKED")));
        when(disputes.findLatestForContract(CONTRACT)).thenReturn(Optional.of(dispute("RESOLVED")));
        when(evidence.belongsToDispute(EVIDENCE, DISPUTE)).thenReturn(true);
    }

    @Test
    void completesWithAuditAndOutboxInOneTransaction() {
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(contract("COMPLETED", 4)));
        when(tracking.findByContractId(CONTRACT)).thenReturn(Optional.of(deposit("RELEASABLE")));
        var result = service.complete(CONTRACT, ADMIN, "Evidence confirms delivery",
                List.of(EVIDENCE), 3);
        assertEquals("COMPLETED", result.status());
        assertEquals("RELEASABLE", result.depositStatus());
        verify(contracts).markCompleted(CONTRACT, 4, NOW);
        verify(tracking).markReleasable(CONTRACT, 3, NOW, NOW, NOW);
        verify(audit).insert(CONTRACT, DISPUTE, ADMIN, 3,
                "Evidence confirms delivery", List.of(EVIDENCE), NOW);
        verify(contractOutbox).statusChanged(contract("COMPLETED", 4), "ACTIVE", ADMIN, NOW);
        verify(depositOutbox).statusChanged(contract("COMPLETED", 4),
                deposit("RELEASABLE"), "LOCKED", ADMIN, NOW);
    }

    @Test
    void releasedDepositRemainsReleased() {
        when(tracking.findByContractIdForUpdate(CONTRACT)).thenReturn(Optional.of(deposit("RELEASED")));
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(contract("COMPLETED", 4)));
        when(tracking.findByContractId(CONTRACT)).thenReturn(Optional.of(deposit("RELEASED")));
        assertEquals("RELEASED", service.complete(CONTRACT, ADMIN, "Verified",
                List.of(EVIDENCE), 3).depositStatus());
        verify(tracking).markCompletedAfterEligible(CONTRACT, 3, NOW);
        verify(tracking, never()).markReleasable(CONTRACT, 3, NOW, NOW, NOW);
        verifyNoInteractions(depositOutbox);
    }

    @Test
    void rejectsUnresolvedAndUnverifiedEvidence() {
        when(disputes.findLatestForContract(CONTRACT)).thenReturn(Optional.of(dispute("OPEN")));
        assertThrows(IllegalStateException.class,
                () -> service.complete(CONTRACT, ADMIN, "Verified", List.of(EVIDENCE), 3));
        when(disputes.findLatestForContract(CONTRACT)).thenReturn(Optional.of(dispute("RESOLVED")));
        when(evidence.belongsToDispute(EVIDENCE, DISPUTE)).thenReturn(false);
        assertThrows(IllegalArgumentException.class,
                () -> service.complete(CONTRACT, ADMIN, "Verified", List.of(EVIDENCE), 3));
        verifyNoInteractions(audit, contractOutbox, depositOutbox);
    }

    @Test
    void replayReturnsRecordedResultWithoutNewEvents() {
        when(contracts.findByIdForUpdate(CONTRACT))
                .thenReturn(Optional.of(contract("COMPLETED", 4)));
        when(tracking.findByContractIdForUpdate(CONTRACT))
                .thenReturn(Optional.of(deposit("RELEASED")));
        when(audit.find(CONTRACT)).thenReturn(Optional.of(new AdminCompletionRepository.Audit(
                DISPUTE, ADMIN, 3, "Verified", List.of(EVIDENCE))));
        when(disputes.findLatestForContract(CONTRACT)).thenReturn(Optional.of(dispute("OPEN")));
        assertEquals("RELEASED", service.complete(CONTRACT, ADMIN, "Verified",
                List.of(EVIDENCE), 3).depositStatus());
        assertThrows(IllegalStateException.class,
                () -> service.complete(CONTRACT, ADMIN, "Different reason", List.of(EVIDENCE), 3));
        verifyNoInteractions(contractOutbox, depositOutbox);
    }

    @Test
    void rejectsHoldAndStaleContractVersion() {
        PaymentTracking held = new PaymentTracking(EVIDENCE, CONTRACT, new BigDecimal("5.00"),
                BigDecimal.ONE, "LOCKED", NOW, NOW, null, null, null, true, 2, NOW, NOW);
        when(tracking.findByContractIdForUpdate(CONTRACT)).thenReturn(Optional.of(held));
        assertThrows(IllegalStateException.class,
                () -> service.complete(CONTRACT, ADMIN, "Verified", List.of(EVIDENCE), 3));
        when(tracking.findByContractIdForUpdate(CONTRACT)).thenReturn(Optional.of(deposit("LOCKED")));
        assertThrows(IllegalStateException.class,
                () -> service.complete(CONTRACT, ADMIN, "Verified", List.of(EVIDENCE), 2));
        verifyNoInteractions(audit, contractOutbox, depositOutbox);
    }

    private Contract contract(String status, long version) {
        return new Contract(CONTRACT, CONTRACT, CONTRACT, FARMER, TRADER,
                BigDecimal.TEN, "terms", NOW, status, new BigDecimal("20.00"),
                "COMPLETED".equals(status) ? NOW : null, version, NOW, NOW);
    }

    private PaymentTracking deposit(String status) {
        return new PaymentTracking(EVIDENCE, CONTRACT, new BigDecimal("5.00"),
                BigDecimal.ONE, status, NOW, NOW, null, null,
                "RELEASED".equals(status) ? NOW : null, false, 2, NOW, NOW);
    }

    private Dispute dispute(String status) {
        return new Dispute(DISPUTE, CONTRACT, FARMER, "DELIVERY", "details", status,
                false, ADMIN, NOW, NOW, "NO_VIOLATION", 3, 1, NOW, NOW);
    }
}
