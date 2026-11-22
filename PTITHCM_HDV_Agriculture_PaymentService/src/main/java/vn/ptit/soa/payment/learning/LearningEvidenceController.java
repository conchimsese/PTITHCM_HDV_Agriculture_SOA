package vn.ptit.soa.payment.learning;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService;
import vn.ptit.soa.payment.dispute.DisputeResponse;
import vn.ptit.soa.payment.dispute.DisputeResponseService;

@RestController
@Profile("learning & database-learning")
@RequestMapping("/learning/disputes/{disputeId}")
public class LearningEvidenceController {
    private final DisputeEvidenceService evidence;
    private final DisputeResponseService responses;

    public LearningEvidenceController(DisputeEvidenceService evidence,
            DisputeResponseService responses) {
        this.evidence = evidence;
        this.responses = responses;
    }

    @PostMapping(value = "/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DisputeEvidenceService.UploadResult upload(@PathVariable String disputeId,
            @RequestParam String actorId,
            @RequestParam(defaultValue = "false") boolean asAdmin,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String sourceAccountId) {
        return evidence.upload(disputeId, actorId, asAdmin, file, description, sourceAccountId);
    }

    @GetMapping("/evidence")
    public DisputeEvidenceService.EvidencePage listEvidence(@PathVariable String disputeId,
            @RequestParam String actorId,
            @RequestParam(defaultValue = "false") boolean asAdmin,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return evidence.list(disputeId, actorId, asAdmin, cursor, limit);
    }

    @GetMapping("/evidence/{evidenceId}")
    public ResponseEntity<byte[]> download(@PathVariable String disputeId,
            @PathVariable String evidenceId, @RequestParam String actorId,
            @RequestParam(defaultValue = "false") boolean asAdmin) {
        DisputeEvidenceService.DownloadResult found = evidence.download(
                disputeId, evidenceId, actorId, asAdmin);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(found.contentType()))
                .cacheControl(CacheControl.noStore().cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(found.bytes());
    }

    @PostMapping("/responses")
    @ResponseStatus(HttpStatus.CREATED)
    public DisputeResponse respond(@PathVariable String disputeId,
            @org.springframework.web.bind.annotation.RequestBody ResponseRequest request) {
        return responses.respond(disputeId, request.actorId(),
                request.statement(), request.evidenceRefs());
    }

    @GetMapping("/responses")
    public List<DisputeResponse> listResponses(@PathVariable String disputeId,
            @RequestParam String actorId,
            @RequestParam(defaultValue = "false") boolean asAdmin) {
        return responses.list(disputeId, actorId, asAdmin);
    }

    public record ResponseRequest(String actorId, String statement, List<String> evidenceRefs) {}
}
