package vn.soa.notification.exception;

import org.springframework.http.HttpStatus;

public class AccessStateUnavailableException extends ApiException {
    public AccessStateUnavailableException(String message) {
        super(HttpStatus.SERVICE_UNAVAILABLE, "ACCESS_STATE_UNAVAILABLE", message);
    }
}
