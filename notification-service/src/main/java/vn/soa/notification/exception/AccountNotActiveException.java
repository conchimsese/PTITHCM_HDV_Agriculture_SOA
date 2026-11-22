package vn.soa.notification.exception;

import org.springframework.http.HttpStatus;

public class AccountNotActiveException extends ApiException {
    public AccountNotActiveException(String message) {
        super(HttpStatus.FORBIDDEN, "ACCOUNT_NOT_ACTIVE", message);
    }
}
