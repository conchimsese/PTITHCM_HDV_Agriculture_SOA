package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminDisputeListServiceTest {
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    private final DisputeRepository disputes = mock(DisputeRepository.class);
    private final AdminDisputeListService service = new AdminDisputeListService(disputes);

    @Test
    void pagesByCreatedAtAndDisputeId() {
        Dispute first = dispute("abb74c4e-35be-4c63-a671-663a54b3b4df", NOW);
        Dispute second = dispute("419a5f73-efe3-4a2c-89ed-6e2342d1f865", NOW.minusSeconds(1));
        when(disputes.findForIndependentAdmin(ADMIN, "OPEN", null, null, 2))
                .thenReturn(List.of(first, second));
        AdminDisputeListService.Page page = service.list(ADMIN, "OPEN", null, 1);
        assertEquals(List.of(first), page.items());
        assertNotNull(page.nextCursor());

        when(disputes.findForIndependentAdmin(ADMIN, "OPEN", NOW, first.disputeId(), 2))
                .thenReturn(List.of(second));
        AdminDisputeListService.Page next = service.list(ADMIN, "OPEN", page.nextCursor(), 1);
        assertEquals(List.of(second), next.items());
        assertNull(next.nextCursor());
        verify(disputes).findForIndependentAdmin(ADMIN, "OPEN", NOW, first.disputeId(), 2);
    }

    @Test
    void rejectsInvalidInputsBeforeQuery() {
        assertThrows(IllegalArgumentException.class,
                () -> service.list(ADMIN, "INVALID", null, 20));
        assertThrows(IllegalArgumentException.class,
                () -> service.list(ADMIN, null, "bad cursor", 20));
        assertThrows(IllegalArgumentException.class,
                () -> service.list(ADMIN, null, null, 101));
        verifyNoInteractions(disputes);
    }

    private Dispute dispute(String id, Instant createdAt) {
        return new Dispute(id, CONTRACT, CONTRACT, "DELIVERY", "details", "OPEN",
                true, null, null, null, null, 1, 0, createdAt, createdAt);
    }
}
