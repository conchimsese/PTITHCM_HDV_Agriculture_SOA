package vn.ptit.soa.payment.dispute;

public class DisputeReadNotFoundException extends RuntimeException {
    public DisputeReadNotFoundException() {
        super("Resource does not exist or is not accessible.");
    }
}
