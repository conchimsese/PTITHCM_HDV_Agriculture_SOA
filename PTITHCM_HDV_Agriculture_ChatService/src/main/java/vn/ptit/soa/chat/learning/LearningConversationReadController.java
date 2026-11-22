package vn.ptit.soa.chat.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.chat.conversation.ConversationReadService;

@RestController
@Profile("learning & database-learning")
@RequestMapping("/learning/conversations")
public class LearningConversationReadController {
    private final ConversationReadService reads;

    public LearningConversationReadController(ConversationReadService reads) {
        this.reads = reads;
    }

    @GetMapping
    public ConversationReadService.ConversationPage list(@RequestParam String viewerId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String cursor) {
        return reads.list(viewerId, limit, cursor);
    }

    @GetMapping("/{conversationId}")
    public ConversationReadService.ConversationDetail detail(@PathVariable String conversationId,
            @RequestParam String viewerId) {
        return reads.detail(conversationId, viewerId);
    }
}
