package vn.ptit.soa.payment.dispute;

import java.math.BigDecimal;
import java.util.Map;

final class ReputationPenalty {
    private static final Map<String, Integer> POINTS = Map.ofEntries(
            Map.entry("F01", 1), Map.entry("F02", 2), Map.entry("F03", 2),
            Map.entry("F04", 3), Map.entry("F05", 2), Map.entry("F06", 3),
            Map.entry("F07", 3), Map.entry("F08", 5), Map.entry("T01", 1),
            Map.entry("T02", 2), Map.entry("T03", 2), Map.entry("T04", 3),
            Map.entry("T05", 3), Map.entry("T06", 3), Map.entry("T07", 5),
            Map.entry("T08", 2));

    private ReputationPenalty() {}

    static BigDecimal requireCancelledViolation(String outcome, String code, String clientPoints) {
        return requireViolation(outcome, code, clientPoints, false);
    }

    static BigDecimal requireViolation(String outcome, String code, String clientPoints, boolean continues) {
        boolean farmer = "FARMER_VIOLATION".equals(outcome);
        boolean trader = "TRADER_VIOLATION".equals(outcome);
        if ((!farmer && !trader) || code == null || clientPoints == null
                || !code.startsWith(farmer ? "F" : "T")) {
            throw new IllegalArgumentException("Violation code and penalty points are required for the liable party.");
        }
        Integer points = POINTS.get(code);
        if (continues && "F04".equals(code)) points = 2;
        if (points == null) throw new IllegalArgumentException("Unsupported violation code.");
        BigDecimal requested;
        try {
            requested = new BigDecimal(clientPoints);
        } catch (NumberFormatException invalid) {
            throw new IllegalArgumentException("Invalid penalty points.", invalid);
        }
        if (requested.compareTo(BigDecimal.valueOf(points)) != 0) {
            throw new IllegalArgumentException("Penalty points do not match the violation code.");
        }
        return BigDecimal.valueOf(points).setScale(1);
    }
}
