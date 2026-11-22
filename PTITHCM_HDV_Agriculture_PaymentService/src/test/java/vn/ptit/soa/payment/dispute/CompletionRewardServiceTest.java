package vn.ptit.soa.payment.dispute;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractRepository;

class CompletionRewardServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-20T00:00:00Z");
    private final ContractRepository contracts = mock(ContractRepository.class);
    private final CompletionRewardRepository rewards = mock(CompletionRewardRepository.class);
    private final ReputationDecisionOutboxRepository outbox = mock(ReputationDecisionOutboxRepository.class);
    private final CompletionRewardService service = new CompletionRewardService(contracts, rewards,
            outbox, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void exactlySeventyTwoHoursProducesOneDecisionPerParticipant() {
        Contract contract = contract("COMPLETED", NOW.minus(72, ChronoUnit.HOURS));
        when(contracts.findByIdForUpdate("contract")).thenReturn(Optional.of(contract));
        when(rewards.insert(eq("contract"), anyString(), anyString(), eq(NOW))).thenReturn(true);
        service.award("contract");
        verify(outbox).completionReward(eq(contract), anyString(), eq("farmer"), eq(NOW));
        verify(outbox).completionReward(eq(contract), anyString(), eq("trader"), eq(NOW));
    }

    @Test
    void beforeDeadlineOrMissingCompletionCannotReward() {
        when(contracts.findByIdForUpdate("contract")).thenReturn(Optional.of(
                contract("COMPLETED", NOW.minus(72, ChronoUnit.HOURS).plusSeconds(1))));
        service.award("contract");
        when(contracts.findByIdForUpdate("contract")).thenReturn(Optional.of(contract("ACTIVE", null)));
        service.award("contract");
        when(contracts.findByIdForUpdate("contract")).thenReturn(Optional.of(contract("COMPLETED", null)));
        service.award("contract");
        verifyNoInteractions(outbox, rewards);
    }

    @Test
    void openCaseOrConfirmedViolationBlocksRewards() {
        when(contracts.findByIdForUpdate("contract")).thenReturn(Optional.of(
                contract("COMPLETED", NOW.minus(73, ChronoUnit.HOURS))));
        when(rewards.blocked("contract")).thenReturn(true);
        service.award("contract");
        verify(rewards, never()).insert(anyString(), anyString(), anyString(), any());
        verifyNoInteractions(outbox);
    }

    @Test
    void alreadyRecordedParticipantsDoNotGetAnotherEvent() {
        when(contracts.findByIdForUpdate("contract")).thenReturn(Optional.of(
                contract("COMPLETED", NOW.minus(73, ChronoUnit.HOURS))));
        service.award("contract"); // insert returns false for existing business keys
        verifyNoInteractions(outbox);
    }

    private Contract contract(String status, Instant completedAt) {
        return new Contract("contract", "offer", "conversation", "farmer", "trader",
                BigDecimal.TEN, "terms", NOW, status, BigDecimal.ZERO, completedAt, 4, NOW, NOW);
    }
}
