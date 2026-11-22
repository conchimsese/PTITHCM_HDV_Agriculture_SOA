package vn.ptit.soa.chat.security;

import java.time.Instant;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.chat.conversation.ConversationReadService;
import vn.ptit.soa.chat.message.ChatMessage;
import vn.ptit.soa.chat.message.ChatMessageService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/conversations/{conversationId}")
public class SecureChatMessageController {
    private final ConversationReadService conversations;
    private final ChatMessageService messages;

    public SecureChatMessageController(ConversationReadService conversations, ChatMessageService messages) {
        this.conversations = conversations;
        this.messages = messages;
    }

    @GetMapping("/messages")
    public ChatMessageService.MessagePage history(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String cursor) {
        requireParticipant(jwt, conversationId);
        return messages.history(conversationId, jwt.getSubject(), limit, cursor);
    }

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public SentMessageResponse send(@AuthenticationPrincipal Jwt jwt, @PathVariable String conversationId,
            @RequestBody SendMessageRequest request) {
        requireParticipant(jwt, conversationId);
        if (request.senderId() != null) throw new IllegalArgumentException("Do not send senderId; it comes from JWT.");
        ChatMessage sent;
        if ("TEXT".equals(request.messageType())) {
            if (request.attachmentUrl() != null) throw new IllegalArgumentException("TEXT cannot attach an image.");
            sent = messages.sendText(conversationId, jwt.getSubject(), request.content());
        } else if ("IMAGE".equals(request.messageType())) {
            if (request.content() != null) throw new IllegalArgumentException("IMAGE content must be empty.");
            sent = messages.sendImageSecure(conversationId, jwt.getSubject(), request.attachmentUrl());
        } else {
            throw new IllegalArgumentException("Only TEXT and IMAGE messages can be sent by a client.");
        }
        return new SentMessageResponse(sent.messageId(), sent.conversationId(), sent.senderId(),
                sent.messageType(), sent.content(), sent.attachmentUrl(), sent.createdAt());
    }

    @PutMapping("/read")
    public ChatMessageService.ReadResult markRead(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String conversationId, @RequestBody ReadRequest request) {
        requireParticipant(jwt, conversationId);
        if (request.readerId() != null) throw new IllegalArgumentException("Do not send readerId; it comes from JWT.");
        return messages.markRead(conversationId, jwt.getSubject(), request.messageId());
    }

    private void requireParticipant(Jwt jwt, String conversationId) {
        conversations.detail(conversationId, jwt.getSubject());
    }

    public record SendMessageRequest(String messageType, String content, String attachmentUrl, String senderId) {}
    public record ReadRequest(String messageId, String readerId) {}
    public record SentMessageResponse(String messageId, String conversationId, String senderId,
            String messageType, String content, String attachmentUrl, Instant createdAt) {}
}
