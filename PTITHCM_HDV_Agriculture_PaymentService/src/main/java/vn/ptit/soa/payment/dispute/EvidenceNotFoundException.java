package vn.ptit.soa.payment.dispute;

public class EvidenceNotFoundException extends RuntimeException {
    public EvidenceNotFoundException() {
        super("Evidence does not exist or is not accessible.");
    }
}
