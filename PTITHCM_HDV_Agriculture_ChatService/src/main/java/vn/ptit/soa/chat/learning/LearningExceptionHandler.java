package vn.ptit.soa.chat.learning;

import java.time.Instant;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import vn.ptit.soa.chat.media.ChatImageCodec;
import vn.ptit.soa.chat.media.ChatMediaService;
import vn.ptit.soa.chat.conversation.ConversationReadService;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@Profile({"learning", "database-learning"})
@RestControllerAdvice(basePackageClasses = LearningController.class)
public class LearningExceptionHandler {
    @ExceptionHandler(ConversationReadService.ConversationNotFoundException.class)
    public ResponseEntity<Map<String, Object>> conversationNotFound(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Conversation not found.", request);
    }

    @ExceptionHandler(ConversationReadService.ConversationAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> conversationForbidden(HttpServletRequest request) {
        return error(403, "FORBIDDEN", "Viewer is not a conversation participant.", request);
    }

    @ExceptionHandler(ChatMediaService.MediaNotFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Image not found.", request);
    }

    @ExceptionHandler({ChatImageCodec.ImageTooLargeException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<Map<String, Object>> tooLarge(HttpServletRequest request) {
        return error(413, "PAYLOAD_TOO_LARGE", "Image exceeds 5 MiB.", request);
    }

    @ExceptionHandler(ChatImageCodec.UnsupportedImageException.class)
    public ResponseEntity<Map<String, Object>> unsupported(HttpServletRequest request) {
        return error(415, "UNSUPPORTED_MEDIA_TYPE", "Only JPEG, PNG and WebP are supported.", request);
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, Object>> invalidInput(Exception exception, HttpServletRequest request) {
        String message = exception instanceof IllegalArgumentException
                ? exception.getMessage() : "Body must be valid JSON with the expected fields.";
        return error(400, "VALIDATION_ERROR", message, request);
    }

    private ResponseEntity<Map<String, Object>> error(int status, String code, String message,
            HttpServletRequest request) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", status,
                "code", code,
                "message", message,
                "path", request.getRequestURI()));
    }
}
