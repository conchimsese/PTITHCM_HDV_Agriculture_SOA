package vn.soa.notification.exception;

public class EventIdReusedException extends RuntimeException {
    public EventIdReusedException(String message) {
        super(message);
    }
}
