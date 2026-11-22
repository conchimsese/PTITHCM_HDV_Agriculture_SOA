package vn.ptit.soa.chat.security;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import vn.ptit.soa.chat.conversation.ConversationReadService;
import vn.ptit.soa.chat.message.ChatMessageService;
import vn.ptit.soa.chat.media.ChatMediaService;
import vn.ptit.soa.chat.media.ChatImageCodec;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice(basePackageClasses = {SecureConversationReadController.class,
        SecureChatMessageController.class, SecureChatMediaController.class})
@Profile("secure")
public class SecureChatExceptionHandler {
    @ExceptionHandler(UserAccessStateClient.AccountForbiddenException.class)
    ResponseEntity<Map<String, Object>> inactive(HttpServletRequest request) {
        return error(403, "ACCOUNT_NOT_ACTIVE", "Account is not active or not allowed for Chat.", request);
    }

    @ExceptionHandler(UserAccessStateClient.AccessStateUnavailableException.class)
    ResponseEntity<Map<String, Object>> unavailable(HttpServletRequest request) {
        return error(503, "ACCESS_STATE_UNAVAILABLE", "Cannot verify account state.", request);
    }

    @ExceptionHandler(ConversationReadService.ConversationAccessDeniedException.class)
    ResponseEntity<Map<String, Object>> forbidden(HttpServletRequest request) {
        return error(403, "FORBIDDEN", "Not a conversation participant.", request);
    }

    @ExceptionHandler(ConversationReadService.ConversationNotFoundException.class)
    ResponseEntity<Map<String, Object>> missing(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Conversation not found.", request);
    }

    @ExceptionHandler({ChatMessageService.MissingConversationException.class,
            ChatMessageService.MissingMessageException.class})
    ResponseEntity<Map<String, Object>> missingMessage(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Conversation or message not found.", request);
    }

    @ExceptionHandler({ChatMessageService.NotParticipantException.class,
            ChatMessageService.NotReadableMessageException.class})
    ResponseEntity<Map<String, Object>> messageForbidden(HttpServletRequest request) {
        return error(403, "FORBIDDEN", "Not allowed to access this message.", request);
    }

    @ExceptionHandler(ChatMessageService.ClosedConversationException.class)
    ResponseEntity<Map<String, Object>> closed(HttpServletRequest request) {
        return error(409, "INVALID_STATE_TRANSITION", "Conversation is closed.", request);
    }

    @ExceptionHandler(ChatMediaService.MediaNotFoundException.class)
    ResponseEntity<Map<String, Object>> mediaMissing(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Image not found.", request);
    }

    @ExceptionHandler(ChatMediaService.ConversationClosedException.class)
    ResponseEntity<Map<String, Object>> mediaClosed(HttpServletRequest request) {
        return error(409, "INVALID_STATE_TRANSITION", "Conversation is closed.", request);
    }

    @ExceptionHandler({ChatImageCodec.ImageTooLargeException.class, MaxUploadSizeExceededException.class})
    ResponseEntity<Map<String, Object>> mediaTooLarge(HttpServletRequest request) {
        return error(413, "PAYLOAD_TOO_LARGE", "Image exceeds 5 MiB.", request);
    }

    @ExceptionHandler(ChatImageCodec.UnsupportedImageException.class)
    ResponseEntity<Map<String, Object>> mediaUnsupported(HttpServletRequest request) {
        return error(415, "UNSUPPORTED_MEDIA_TYPE", "Only JPEG, PNG and WebP are supported.", request);
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
    ResponseEntity<Map<String, Object>> invalid(Exception exception, HttpServletRequest request) {
        String message = exception instanceof IllegalArgumentException
                ? exception.getMessage() : "Body must be valid JSON with the expected fields.";
        return error(400, "VALIDATION_ERROR", message, request);
    }

    private ResponseEntity<Map<String, Object>> error(int status, String code, String message,
            HttpServletRequest request) {
        return ResponseEntity.status(status).header("Cache-Control", "no-store").body(Map.of(
                "timestamp", Instant.now().toString(), "status", status, "code", code,
                "message", message, "path", request.getRequestURI()));
    }
}
