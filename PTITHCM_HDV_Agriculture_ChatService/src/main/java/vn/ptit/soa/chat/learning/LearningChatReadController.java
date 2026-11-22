package vn.ptit.soa.chat.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.chat.message.ChatMessageService;

@RestController
@Profile("learning & database-learning")
@RequestMapping("/learning/conversations/{conversationId}/read")
public class LearningChatReadController {
    private final ChatMessageService messages;

    public LearningChatReadController(ChatMessageService messages) {
        this.messages = messages;
    }

    @PutMapping
    public ChatMessageService.ReadResult markRead(@PathVariable String conversationId,
            @RequestBody ReadRequest request) {
        return messages.markRead(conversationId, request.readerId(), request.messageId());
    }

    public record ReadRequest(String readerId, String messageId) {}
}
