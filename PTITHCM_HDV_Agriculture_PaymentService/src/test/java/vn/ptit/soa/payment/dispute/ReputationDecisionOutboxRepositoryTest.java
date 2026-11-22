package vn.ptit.soa.payment.dispute;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.ptit.soa.payment.contract.Contract;

class ReputationDecisionOutboxRepositoryTest {
    @Test
    void historicalDecisionWithoutPenaltyEventDoesNotProducePhantomReversal() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var repository = new ReputationDecisionOutboxRepository(jdbc, new ObjectMapper());
        Instant now = Instant.parse("2026-10-20T00:00:00Z");
        var contract = new Contract("contract", "offer", "conversation", "farmer", "trader",
                BigDecimal.TEN, "terms", now, "CANCELLED", BigDecimal.ZERO,
                null, 4, now, now);
        var reversal = new DecisionReversal("reversal", "original", "dispute", "admin",
                "Corrected", List.of("evidence"), now);
        repository.reversePenalty(contract, reversal, 2);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void reverseCompletionRewardInsertsOutboxRow() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var repository = new ReputationDecisionOutboxRepository(jdbc, new ObjectMapper());
        Instant now = Instant.parse("2026-10-20T00:00:00Z");
        var contract = new Contract("contract-id", "offer", "conversation", "farmer-id", "trader-id",
                BigDecimal.TEN, "terms", now, "COMPLETED", BigDecimal.ZERO,
                now, 4, now, now);
        repository.reverseCompletionReward(contract, "original-reward-id", "farmer-id", "admin-id", now);
        verify(jdbc).update(anyString(), any(), any(), any(), any(), any(), any(), any());
    }
}
