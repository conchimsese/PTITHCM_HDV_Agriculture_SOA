package vn.ptit.soa.payment.contract;

public class DepositNotFoundException extends RuntimeException {
    public DepositNotFoundException() {
        super("Deposit does not exist or is not accessible.");
    }
}
