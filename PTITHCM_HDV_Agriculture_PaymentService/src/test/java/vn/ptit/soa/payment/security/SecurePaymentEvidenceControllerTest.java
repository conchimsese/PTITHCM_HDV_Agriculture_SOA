package vn.ptit.soa.payment.security;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.Jwt;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService;

class SecurePaymentEvidenceControllerTest {
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String EVIDENCE = "11111111-1111-4111-8111-111111111111";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";

    @Test
    void participantUploadUsesJwtAndReturnsPrivateUrl() {
        DisputeEvidenceService service = mock(DisputeEvidenceService.class);
        var controller = new SecurePaymentEvidenceController(service);
        var file = new MockMultipartFile("file", "proof.png", "image/png", new byte[] {1});
        when(service.upload(DISPUTE, FARMER, false, file, "proof", null))
                .thenReturn(new DisputeEvidenceService.UploadResult(EVIDENCE,
                        "/learning/disputes/" + DISPUTE + "/evidence/" + EVIDENCE,
                        "image/png", 100));
        var result = controller.upload(DISPUTE, file, "proof", null, jwt(FARMER, "FARMER"));
        assertEquals(EVIDENCE, result.evidenceId());
        assertEquals("/api/v1/payments/disputes/" + DISPUTE + "/evidence/" + EVIDENCE,
                result.downloadUrl());
        verify(service).upload(DISPUTE, FARMER, false, file, "proof", null);
    }

    @Test
    void assignedAdminUploadKeepsDeclaredSourceAndListUsesJwt() {
        DisputeEvidenceService service = mock(DisputeEvidenceService.class);
        var controller = new SecurePaymentEvidenceController(service);
        var file = new MockMultipartFile("file", "proof.png", "image/png", new byte[] {1});
        when(service.upload(DISPUTE, ADMIN, true, file, "email", FARMER))
                .thenReturn(new DisputeEvidenceService.UploadResult(EVIDENCE, "old-url", "image/png", 100));
        controller.upload(DISPUTE, file, "email", FARMER, jwt(ADMIN, "ADMIN"));
        verify(service).upload(DISPUTE, ADMIN, true, file, "email", FARMER);
        var item = new DisputeEvidenceService.EvidenceItem(EVIDENCE, ADMIN, FARMER,
                "email", "image/png", 100, Instant.parse("2026-10-19T00:00:00Z"), "old-url");
        when(service.list(DISPUTE, FARMER, false, null, 1))
                .thenReturn(new DisputeEvidenceService.EvidencePage(List.of(item), null));
        var page = controller.list(DISPUTE, null, 1, jwt(FARMER, "FARMER"));
        assertEquals(FARMER, page.items().get(0).sourceAccountId());
        assertTrue(page.items().get(0).downloadUrl().startsWith("/api/v1/payments/"));
    }

    @Test
    void downloadIsPrivateAndNeverReturnsStoragePath() {
        DisputeEvidenceService service = mock(DisputeEvidenceService.class);
        var controller = new SecurePaymentEvidenceController(service);
        byte[] bytes = {1, 2, 3};
        when(service.download(DISPUTE, EVIDENCE, FARMER, false))
                .thenReturn(new DisputeEvidenceService.DownloadResult("image/png", bytes));
        var response = controller.download(DISPUTE, EVIDENCE, jwt(FARMER, "FARMER"));
        assertArrayEquals(bytes, response.getBody());
        assertEquals("no-store, private", response.getHeaders().getCacheControl());
        assertEquals("nosniff", response.getHeaders().getFirst("X-Content-Type-Options"));
    }

    private Jwt jwt(String id, String role) {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(id);
        when(jwt.getClaimAsString("role")).thenReturn(role);
        return jwt;
    }
}
