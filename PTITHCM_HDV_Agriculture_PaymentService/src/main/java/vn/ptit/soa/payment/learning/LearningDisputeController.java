package vn.ptit.soa.payment.learning;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.payment.dispute.Dispute;
import vn.ptit.soa.payment.dispute.DisputeService;
import vn.ptit.soa.payment.dispute.AdminDisputeListService;
import vn.ptit.soa.payment.dispute.DisputeReadService;
import vn.ptit.soa.payment.dispute.AdminCompletionService;
import vn.ptit.soa.payment.dispute.AdminDisputeFilingService;
import vn.ptit.soa.payment.dispute.DisputeSettlementService;

@RestController
@Profile("learning & database-learning")
@RequestMapping("/learning")
public class LearningDisputeController {
    private final DisputeService disputes;
    private final AdminDisputeListService adminList;
    private final DisputeReadService reads;
    private final AdminCompletionService adminCompletion;
    private final AdminDisputeFilingService adminFiling;
    private final DisputeSettlementService settlement;

    public LearningDisputeController(DisputeService disputes, AdminDisputeListService adminList,
            DisputeReadService reads, AdminCompletionService adminCompletion,
            AdminDisputeFilingService adminFiling, DisputeSettlementService settlement) {
        this.disputes = disputes;
        this.adminList = adminList;
        this.reads = reads;
        this.adminCompletion = adminCompletion;
        this.adminFiling = adminFiling;
        this.settlement = settlement;
    }

    @PostMapping("/contracts/{contractId}/disputes")
    @ResponseStatus(HttpStatus.CREATED)
    public Dispute open(@PathVariable String contractId, @RequestBody OpenRequest request) {
        return disputes.open(contractId, request.actorId(), request.reasonCode(),
                request.description(), request.evidenceRefs());
    }

    @PostMapping("/admin/contracts/{contractId}/disputes")
    @ResponseStatus(HttpStatus.CREATED)
    public Dispute openForAdmin(@PathVariable String contractId,
            @RequestBody AdminOpenRequest request) {
        return adminFiling.open(contractId, request.adminId(), request.onBehalfOfAccountId(),
                request.reasonCode(), request.description(), request.verificationNote());
    }

    @GetMapping("/disputes/{disputeId}")
    public DisputeReadService.DisputeDetail find(@PathVariable String disputeId,
            @RequestParam String actorId) {
        return reads.dispute(disputeId, actorId, false);
    }

    @GetMapping("/admin/disputes/{disputeId}")
    public DisputeReadService.DisputeDetail findForAdmin(@PathVariable String disputeId,
            @RequestParam String adminId) {
        return reads.dispute(disputeId, adminId, true);
    }

    @GetMapping("/admin/disputes")
    public AdminDisputeListService.Page listForAdmin(@RequestParam String adminId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return adminList.list(adminId, status, cursor, limit);
    }

    @PostMapping("/admin/disputes/{disputeId}/review")
    public Dispute review(@PathVariable String disputeId, @RequestBody ReviewRequest request) {
        return disputes.review(disputeId, request.adminId(), request.note(), request.expectedVersion());
    }

    @PostMapping("/admin/disputes/{disputeId}/decisions")
    public Dispute closeSafely(@PathVariable String disputeId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody SafeDecisionRequest request) {
        return disputes.closeSafely(disputeId, request.decisionId(), idempotencyKey,
                request.adminId(), request.expectedVersion(), request.outcome(),
                request.depositDisposition(), request.reason(), request.evidenceRefs(),
                request.liableAccountId(), request.violationCode(), request.penaltyPoints());
    }

    @PostMapping("/admin/disputes/{disputeId}/settlement-decisions")
    public Dispute settle(@PathVariable String disputeId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody SafeDecisionRequest request) {
        return settlement.settle(disputeId, request.decisionId(), idempotencyKey,
                request.adminId(), request.expectedVersion(), request.outcome(),
                request.depositDisposition(), request.reason(), request.evidenceRefs(),
                request.liableAccountId(), request.violationCode(), request.penaltyPoints());
    }

    @PostMapping("/admin/contracts/{contractId}/complete")
    public AdminCompletionService.Result adminComplete(@PathVariable String contractId,
            @RequestBody AdminCompleteRequest request) {
        return adminCompletion.complete(contractId, request.adminId(), request.reason(),
                request.evidenceRefs(), request.expectedVersion());
    }

    public record OpenRequest(String actorId, String reasonCode, String description,
            List<String> evidenceRefs) {}
    public record AdminOpenRequest(String adminId, String onBehalfOfAccountId,
            String reasonCode, String description, String verificationNote) {}

    public record ReviewRequest(String adminId, String note, Long expectedVersion) {}

    public record SafeDecisionRequest(String decisionId, String adminId, long expectedVersion,
            String outcome, String depositDisposition, String reason, List<String> evidenceRefs,
            String liableAccountId, String violationCode, String penaltyPoints) {}

    public record AdminCompleteRequest(String adminId, String reason,
            List<String> evidenceRefs, long expectedVersion) {}
}
