package vn.ptit.soa.payment.learning;

import java.time.Instant;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import vn.ptit.soa.payment.contract.TradingDepositClient.TradingUnavailableException;
import vn.ptit.soa.payment.contract.DepositNotFoundException;
import vn.ptit.soa.payment.dispute.EvidenceNotFoundException;
import vn.ptit.soa.payment.dispute.DisputeReadNotFoundException;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService.ImageTooLargeException;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService.UnsupportedImageException;
import vn.ptit.soa.payment.dispute.DisputeEvidenceService.EvidenceStorageException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@Profile({"learning", "database-learning"})
@RestControllerAdvice(basePackageClasses = LearningController.class)
public class LearningExceptionHandler {
    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, Object>> invalidInput(Exception exception, HttpServletRequest request) {
        String message = exception instanceof IllegalArgumentException
                ? exception.getMessage() : "Body must be valid JSON with the expected fields.";
        return ResponseEntity.badRequest().body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "code", "VALIDATION_ERROR",
                "message", message,
                "path", request.getRequestURI()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> conflict(IllegalStateException exception,
            HttpServletRequest request) {
        return ResponseEntity.status(409).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 409,
                "code", "CONFLICT",
                "message", exception.getMessage(),
                "path", request.getRequestURI()));
    }

    @ExceptionHandler(TradingUnavailableException.class)
    public ResponseEntity<Map<String, Object>> tradingUnavailable(TradingUnavailableException exception,
            HttpServletRequest request) {
        return ResponseEntity.status(503).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 503,
                "code", "DEPENDENCY_UNAVAILABLE",
                "message", exception.getMessage(),
                "path", request.getRequestURI()));
    }

    @ExceptionHandler({EvidenceNotFoundException.class, DepositNotFoundException.class,
            DisputeReadNotFoundException.class})
    public ResponseEntity<Map<String, Object>> resourceNotFound(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Resource does not exist or is not accessible.", request);
    }

    @ExceptionHandler({ImageTooLargeException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<Map<String, Object>> imageTooLarge(HttpServletRequest request) {
        return error(413, "PAYLOAD_TOO_LARGE", "Image exceeds the upload limit.", request);
    }

    @ExceptionHandler(UnsupportedImageException.class)
    public ResponseEntity<Map<String, Object>> unsupportedImage(HttpServletRequest request) {
        return error(415, "UNSUPPORTED_MEDIA_TYPE", "Only JPEG, PNG, and WebP are supported.", request);
    }

    @ExceptionHandler(EvidenceStorageException.class)
    public ResponseEntity<Map<String, Object>> evidenceUnavailable(HttpServletRequest request) {
        return error(503, "DEPENDENCY_UNAVAILABLE", "Evidence storage is unavailable.", request);
    }

    private ResponseEntity<Map<String, Object>> error(int status, String code,
            String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", status,
                "code", code,
                "message", message,
                "path", request.getRequestURI()));
    }
}
