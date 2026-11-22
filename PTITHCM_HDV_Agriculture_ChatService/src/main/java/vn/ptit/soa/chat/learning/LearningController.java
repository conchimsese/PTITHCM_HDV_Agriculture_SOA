package vn.ptit.soa.chat.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("learning")
@RequestMapping("/learning")
public class LearningController {
    private final LearningMessageService messageService;

    public LearningController(LearningMessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping("/message-preview")
    public LearningMessageService.MessagePreview preview(@RequestBody MessageRequest request) {
        return messageService.preview(request.content());
    }

    public record MessageRequest(String content) {}
}
