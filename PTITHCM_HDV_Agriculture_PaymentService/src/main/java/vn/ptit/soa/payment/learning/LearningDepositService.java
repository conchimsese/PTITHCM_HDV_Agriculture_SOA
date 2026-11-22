package vn.ptit.soa.payment.learning;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("learning")
public class LearningDepositService {
    private static final BigDecimal DEPOSIT_FRACTION = new BigDecimal("0.05");

    public DepositPreview preview(String totalAmount) {
        if (totalAmount == null || !totalAmount.matches("[0-9]{1,13}\\.[0-9]{2}")) {
            throw new IllegalArgumentException("totalAmount must be a positive decimal string, e.g. 92000000.00 (max 13 integer digits).");
        }
        BigDecimal total = new BigDecimal(totalAmount);
        if (total.signum() <= 0) {
            throw new IllegalArgumentException("totalAmount must be greater than zero.");
        }
        BigDecimal deposit = total.multiply(DEPOSIT_FRACTION)
                .setScale(0, RoundingMode.HALF_UP).setScale(2);
        return new DepositPreview(total.setScale(2).toPlainString(), 5,
                deposit.toPlainString(), "VND", false);
    }

    public record DepositPreview(String totalAmount, int depositRate,
                                 String depositAmount, String currency, boolean persisted) {}
}
