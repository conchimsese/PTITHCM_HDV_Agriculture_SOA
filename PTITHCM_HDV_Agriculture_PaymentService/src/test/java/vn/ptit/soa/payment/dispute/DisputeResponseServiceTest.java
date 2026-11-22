package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
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

class DisputeResponseServiceTest {
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String OUTSIDER = "00000000-0000-0000-0000-000000000001";
    private static final String EVIDENCE = "abb74c4e-35be-4c63-a671-663a54b3b4df";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    private DisputeRepository disputes;
    private DisputeResponseRepository responses;
    private DisputeEvidenceRepository evidence;
    private ContractRepository contracts;
    private DisputeResponseService service;

    @BeforeEach
    void setUp() {
        disputes = mock(DisputeRepository.class);
        responses = mock(DisputeResponseRepository.class);
        evidence = mock(DisputeEvidenceRepository.class);
        contracts = mock(ContractRepository.class);
        service = new DisputeResponseService(disputes, responses, evidence, contracts,
                Clock.fixed(NOW, ZoneOffset.UTC), mock(DisputeService.class));
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(new Contract(CONTRACT,
                EVIDENCE, EVIDENCE, FARMER, TRADER, BigDecimal.ONE, "terms", NOW,
                "ACTIVE", BigDecimal.ZERO, null, 1, NOW, NOW)));
    }

    @Test
    void onlyOwnEvidenceFromThisDisputeCanBeReferenced() {
        when(disputes.findByIdForUpdate(DISPUTE)).thenReturn(Optional.of(dispute("OPEN")));
        assertThrows(IllegalArgumentException.class,
                () -> service.respond(DISPUTE, FARMER, "My response", List.of(EVIDENCE)));
        verify(evidence).belongsTo(EVIDENCE, DISPUTE, FARMER);
        verifyNoInteractions(responses);

        when(evidence.belongsTo(EVIDENCE, DISPUTE, FARMER)).thenReturn(true);
        DisputeResponse saved = service.respond(DISPUTE, FARMER, " My response ", List.of(EVIDENCE));
        assertEquals("My response", saved.statement());
        assertEquals(List.of(EVIDENCE), saved.evidenceRefs());
        verify(responses).insert(saved);
    }

    @Test
    void outsiderCannotRespondAndResolvedDisputeIsClosed() {
        when(disputes.findByIdForUpdate(DISPUTE)).thenReturn(Optional.of(dispute("OPEN")));
        assertThrows(IllegalArgumentException.class,
                () -> service.respond(DISPUTE, OUTSIDER, "Outsider", List.of()));
        when(disputes.findByIdForUpdate(DISPUTE)).thenReturn(Optional.of(dispute("RESOLVED")));
        assertThrows(IllegalStateException.class,
                () -> service.respond(DISPUTE, TRADER, "Too late", List.of()));
        verifyNoInteractions(responses);
    }

    private Dispute dispute(String status) {
        return new Dispute(DISPUTE, CONTRACT, FARMER, "DELIVERY", "details", status,
                true, null, null, null, null, 1, 0, NOW, NOW);
    }
}
