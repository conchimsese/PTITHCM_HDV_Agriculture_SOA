package vn.ptit.soa.payment.security;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import vn.ptit.soa.payment.contract.DepositNotFoundException;
import vn.ptit.soa.payment.dispute.DisputeReadNotFoundException;
import vn.ptit.soa.payment.dispute.DecisionReversalForbiddenException;
import vn.ptit.soa.payment.dispute.EvidenceNotFoundException;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService.EvidenceStorageException;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService.ImageTooLargeException;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService.UnsupportedImageException;

@Profile("secure")
@RestControllerAdvice(basePackages = "vn.ptit.soa.payment.security")
public class SecurePaymentExceptionHandler {
    @ExceptionHandler({ChatConversationClient.ChatUnavailableException.class,
            vn.ptit.soa.payment.contract.TradingDepositClient.TradingUnavailableException.class})
    public ResponseEntity<Map<String, Object>> dependencyUnavailable(HttpServletRequest request) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "DEPENDENCY_UNAVAILABLE", "Cannot verify upstream service.", request);
    }
    @ExceptionHandler({DepositNotFoundException.class, DisputeReadNotFoundException.class,
            EvidenceNotFoundException.class})
    public ResponseEntity<Map<String, Object>> notFound(HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource does not exist or is not accessible.", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> invalidInput(IllegalArgumentException exception,
            HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", exception.getMessage(), request);
    }

    @ExceptionHandler({PaymentActionForbiddenException.class, DecisionReversalForbiddenException.class})
    public ResponseEntity<Map<String, Object>> forbidden(HttpServletRequest request) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", "This account cannot perform the action.", request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> conflict(IllegalStateException exception,
            HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, "CONFLICT", exception.getMessage(), request);
    }

    @ExceptionHandler({ImageTooLargeException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<Map<String, Object>> imageTooLarge(HttpServletRequest request) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "PAYLOAD_TOO_LARGE", "Image exceeds the upload limit.", request);
    }

    @ExceptionHandler(UnsupportedImageException.class)
    public ResponseEntity<Map<String, Object>> unsupportedImage(HttpServletRequest request) {
        return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                "Only JPEG, PNG, and WebP are supported.", request);
    }

    @ExceptionHandler(EvidenceStorageException.class)
    public ResponseEntity<Map<String, Object>> evidenceUnavailable(HttpServletRequest request) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "DEPENDENCY_UNAVAILABLE",
                "Evidence storage is unavailable.", request);
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String code,
            String message, HttpServletRequest request) {
        return ResponseEntity.status(status).header("Cache-Control", "no-store").body(Map.of(
                "timestamp", Instant.now().toString(), "status", status.value(),
                "code", code, "message", message, "path", request.getRequestURI()));
    }
}
