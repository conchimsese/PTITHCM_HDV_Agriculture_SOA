package vn.ptit.soa.payment.security;

import java.time.Instant;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/payments/disputes/{disputeId}/evidence")
public class SecurePaymentEvidenceController {
    private final DisputeEvidenceService evidence;

    public SecurePaymentEvidenceController(DisputeEvidenceService evidence) {
        this.evidence = evidence;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DisputeEvidenceService.UploadResult upload(@PathVariable String disputeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String sourceAccountId,
            @AuthenticationPrincipal Jwt jwt) {
        boolean asAdmin = isAdmin(jwt);
        DisputeEvidenceService.UploadResult saved = evidence.upload(disputeId, jwt.getSubject(),
                asAdmin, file, description, sourceAccountId);
        return new DisputeEvidenceService.UploadResult(saved.evidenceId(),
                url(disputeId, saved.evidenceId()), saved.contentType(), saved.sizeBytes());
    }

    @GetMapping
    public EvidencePage list(@PathVariable String disputeId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal Jwt jwt) {
        DisputeEvidenceService.EvidencePage page = evidence.list(disputeId, jwt.getSubject(),
                isAdmin(jwt), cursor, limit);
        List<EvidenceItem> items = page.items().stream()
                .map(item -> new EvidenceItem(item.evidenceId(), item.uploaderId(),
                        item.sourceAccountId(), item.description(), item.contentType(),
                        item.sizeBytes(), item.createdAt(), url(disputeId, item.evidenceId())))
                .toList();
        return new EvidencePage(items, page.nextCursor());
    }

    @GetMapping("/{evidenceId}")
    public ResponseEntity<byte[]> download(@PathVariable String disputeId,
            @PathVariable String evidenceId, @AuthenticationPrincipal Jwt jwt) {
        DisputeEvidenceService.DownloadResult found = evidence.download(disputeId,
                evidenceId, jwt.getSubject(), isAdmin(jwt));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(found.contentType()))
                .cacheControl(CacheControl.noStore().cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(found.bytes());
    }

    private boolean isAdmin(Jwt jwt) {
        return "ADMIN".equals(jwt.getClaimAsString("role"));
    }

    private String url(String disputeId, String evidenceId) {
        return "/api/v1/payments/disputes/" + disputeId + "/evidence/" + evidenceId;
    }

    public record EvidenceItem(String evidenceId, String uploaderId, String sourceAccountId,
            String description, String contentType, long sizeBytes, Instant createdAt,
            String downloadUrl) {}

    public record EvidencePage(List<EvidenceItem> items, String nextCursor) {}
}
