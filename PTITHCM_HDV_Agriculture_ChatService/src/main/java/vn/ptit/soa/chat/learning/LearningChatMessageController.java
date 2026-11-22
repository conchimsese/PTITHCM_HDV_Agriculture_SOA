package vn.ptit.soa.chat.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageService;

@RestController
@Profile("learning & database-learning")
@RequestMapping("/learning/conversations/{conversationId}/messages")
public class LearningChatMessageController {
    private final ChatMessageService messages;

    public LearningChatMessageController(ChatMessageService messages) {
        this.messages = messages;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessage send(@PathVariable String conversationId, @RequestBody SendMessageRequest request) {
        if ("TEXT".equals(request.messageType())) {
            if (request.attachmentUrl() != null) throw new IllegalArgumentException("TEXT cannot attach an image.");
            return messages.sendText(conversationId, request.senderId(), request.content());
        }
        if ("IMAGE".equals(request.messageType())) {
            if (request.content() != null) throw new IllegalArgumentException("IMAGE content must be empty.");
            return messages.sendImage(conversationId, request.senderId(), request.attachmentUrl());
        }
        throw new IllegalArgumentException("Only TEXT and IMAGE messages can be sent by a client.");
    }

    public record SendMessageRequest(String senderId, String messageType, String content, String attachmentUrl) {}

    @GetMapping
    public ChatMessageService.MessagePage history(@PathVariable String conversationId,
            @RequestParam String viewerId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String cursor) {
        return messages.history(conversationId, viewerId, limit, cursor);
    }
}
