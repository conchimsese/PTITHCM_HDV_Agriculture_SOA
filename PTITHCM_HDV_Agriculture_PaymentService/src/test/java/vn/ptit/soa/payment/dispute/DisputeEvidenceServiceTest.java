package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

class DisputeEvidenceServiceTest {
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String ACTOR = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");
    @TempDir Path tempDir;

    @Test
    void reencodesImageAndServesOnlyMatchingBytes() throws Exception {
        DisputeService disputes = mock(DisputeService.class);
        DisputeEvidenceRepository repo = mock(DisputeEvidenceRepository.class);
        when(disputes.requireEvidenceAccess(DISPUTE, ACTOR, false, true))
                .thenReturn(dispute());
        when(disputes.requireEvidenceAccess(DISPUTE, ACTOR, false, false))
                .thenReturn(dispute());
        DisputeEvidenceService service = service(disputes, repo, 5 * 1024 * 1024);
        byte[] png = png();
        MockMultipartFile upload = new MockMultipartFile("file", "evil.jpg",
                "image/jpeg", png);
        DisputeEvidenceService.UploadResult result = service.upload(
                DISPUTE, ACTOR, false, upload, "photo");
        assertEquals("image/png", result.contentType());
        ArgumentCaptor<DisputeEvidence> saved = ArgumentCaptor.forClass(DisputeEvidence.class);
        verify(repo).insert(saved.capture());
        DisputeEvidence metadata = saved.getValue();
        assertEquals(DISPUTE, metadata.disputeId());
        assertEquals(ACTOR, metadata.uploaderId());
        when(repo.find(metadata.evidenceId(), DISPUTE)).thenReturn(Optional.of(metadata));
        byte[] downloaded = service.download(DISPUTE, metadata.evidenceId(), ACTOR, false).bytes();
        assertArrayEquals(Files.readAllBytes(tempDir.resolve(metadata.storageKey() + ".png")), downloaded);
        assertTrue(downloaded.length > 0);

        // Same-size tampering must fail the digest check.
        byte[] tampered = downloaded.clone();
        tampered[tampered.length - 1] ^= 1;
        Files.write(tempDir.resolve(metadata.storageKey() + ".png"), tampered);
        assertThrows(EvidenceNotFoundException.class,
                () -> service.download(DISPUTE, metadata.evidenceId(), ACTOR, false));
    }

    @Test
    void rejectsUnsupportedAndOversizeInput() throws Exception {
        DisputeService disputes = mock(DisputeService.class);
        DisputeEvidenceRepository repo = mock(DisputeEvidenceRepository.class);
        when(disputes.requireEvidenceAccess(DISPUTE, ACTOR, false, true))
                .thenReturn(dispute());
        DisputeEvidenceService service = service(disputes, repo, 16);
        assertThrows(DisputeEvidenceService.UnsupportedImageException.class,
                () -> service.upload(DISPUTE, ACTOR, false,
                        new MockMultipartFile("file", "note.pdf", "application/pdf",
                                "%PDF".getBytes()), null));
        assertThrows(DisputeEvidenceService.ImageTooLargeException.class,
                () -> service.upload(DISPUTE, ACTOR, false,
                        new MockMultipartFile("file", "image.png", "image/png", png()), null));
    }

    @Test
    void webpDecoderIsAvailable() {
        assertTrue(ImageIO.getImageReadersByFormatName("WebP").hasNext());
    }

    @Test
    void adminUploadRecordsParticipantSourceAndRejectsMissingSource() throws Exception {
        DisputeService disputes = mock(DisputeService.class);
        DisputeEvidenceRepository repo = mock(DisputeEvidenceRepository.class);
        when(disputes.requireEvidenceAccess(DISPUTE, ADMIN, true, true)).thenReturn(dispute());
        when(disputes.requireEvidenceSource(dispute(), ACTOR)).thenReturn(ACTOR);
        when(disputes.requireEvidenceSource(dispute(), null))
                .thenThrow(new IllegalArgumentException("Source required."));
        DisputeEvidenceService service = service(disputes, repo, 5 * 1024 * 1024);
        var image = new MockMultipartFile("file", "proof.png", "image/png", png());
        assertThrows(IllegalArgumentException.class,
                () -> service.upload(DISPUTE, ADMIN, true, image, "email photo", null));
        service.upload(DISPUTE, ADMIN, true, image, "email photo", ACTOR);
        ArgumentCaptor<DisputeEvidence> saved = ArgumentCaptor.forClass(DisputeEvidence.class);
        verify(repo).insert(saved.capture());
        assertEquals(ADMIN, saved.getValue().uploaderId());
        assertEquals(ACTOR, saved.getValue().sourceAccountId());
    }

    @Test
    void listPaginatesOnlyAuthorizedMetadataWithoutStorageKey() {
        DisputeService disputes = mock(DisputeService.class);
        DisputeEvidenceRepository repo = mock(DisputeEvidenceRepository.class);
        when(disputes.requireEvidenceAccess(DISPUTE, ACTOR, false, false)).thenReturn(dispute());
        DisputeEvidenceService service = service(disputes, repo, 5 * 1024 * 1024);
        String firstId = UUID.randomUUID().toString();
        String secondId = UUID.randomUUID().toString();
        DisputeEvidence first = new DisputeEvidence(firstId, DISPUTE, ADMIN, ACTOR,
                UUID.randomUUID().toString(), "image/png", 72, "digest", "proof", NOW, NOW);
        DisputeEvidence second = new DisputeEvidence(secondId, DISPUTE, ACTOR, null,
                UUID.randomUUID().toString(), "image/png", 73, "digest", "reply",
                NOW.minusSeconds(1), NOW.minusSeconds(1));
        when(repo.findPage(DISPUTE, null, null, 2)).thenReturn(List.of(first, second));
        var page = service.list(DISPUTE, ACTOR, false, null, 1);
        assertEquals(firstId, page.items().get(0).evidenceId());
        assertEquals(ACTOR, page.items().get(0).sourceAccountId());
        assertTrue(page.nextCursor() != null);
        when(repo.findPage(DISPUTE, NOW, firstId, 2)).thenReturn(List.of(second));
        var next = service.list(DISPUTE, ACTOR, false, page.nextCursor(), 1);
        assertEquals(secondId, next.items().get(0).evidenceId());
        assertEquals(null, next.nextCursor());
    }

    @Test
    void cleanupOnlyRemovesOldUnreferencedEvidenceFiles() throws Exception {
        DisputeEvidenceRepository repo = mock(DisputeEvidenceRepository.class);
        DisputeEvidenceService service = service(mock(DisputeService.class), repo, 1024);
        String orphanKey = UUID.randomUUID().toString();
        String savedKey = UUID.randomUUID().toString();
        Path orphan = tempDir.resolve(orphanKey + ".png");
        Path saved = tempDir.resolve(savedKey + ".png");
        Path unrelated = tempDir.resolve("notes.png");
        Files.write(orphan, png());
        Files.write(saved, png());
        Files.write(unrelated, png());
        FileTime old = FileTime.from(NOW.minusSeconds(25 * 3600));
        Files.setLastModifiedTime(orphan, old);
        Files.setLastModifiedTime(saved, old);
        Files.setLastModifiedTime(unrelated, old);
        when(repo.storageKeyExists(savedKey)).thenReturn(true);

        assertEquals(1, service.cleanupOrphans());
        assertTrue(Files.notExists(orphan));
        assertTrue(Files.exists(saved));
        assertTrue(Files.exists(unrelated));
    }

    private DisputeEvidenceService service(DisputeService disputes,
            DisputeEvidenceRepository repo, long max) {
        return new DisputeEvidenceService(disputes, repo,
                Clock.fixed(NOW, ZoneOffset.UTC), tempDir.toString(), max);
    }

    private Dispute dispute() {
        return new Dispute(DISPUTE, "d25c8106-a76f-4480-a747-6f0c7e2a042d",
                ACTOR, "DELIVERY", "text", "OPEN", true, null, null, null,
                null, 1, 0, NOW, NOW);
    }

    private byte[] png() throws Exception {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, 0xff00ff);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
