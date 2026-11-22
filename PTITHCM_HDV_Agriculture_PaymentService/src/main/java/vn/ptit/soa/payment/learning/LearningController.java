package vn.ptit.soa.payment.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("learning")
@RequestMapping("/learning")
public class LearningController {
    private final LearningDepositService depositService;

    public LearningController(LearningDepositService depositService) {
        this.depositService = depositService;
    }

    @PostMapping("/deposit-preview")
    public LearningDepositService.DepositPreview preview(@RequestBody DepositRequest request) {
        return depositService.preview(request.totalAmount());
    }

    public record DepositRequest(String totalAmount) {}
}
