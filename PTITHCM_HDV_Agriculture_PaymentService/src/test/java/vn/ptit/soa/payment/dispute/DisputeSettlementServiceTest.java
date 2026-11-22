package vn.ptit.soa.payment.dispute;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.ptit.soa.payment.contract.Contract;
import vn.ptit.soa.payment.contract.ContractOutboxRepository;
import vn.ptit.soa.payment.contract.ContractRepository;
import vn.ptit.soa.payment.contract.DepositOutboxRepository;
import vn.ptit.soa.payment.contract.PaymentTracking;
import vn.ptit.soa.payment.contract.PaymentTrackingRepository;

class DisputeSettlementServiceTest {
    private static final String CONTRACT = "d25c8106-a76f-4480-a747-6f0c7e2a042d";
    private static final String DISPUTE = "419a5f73-efe3-4a2c-89ed-6e2342d1f865";
    private static final String DECISION = "abb74c4e-35be-4c63-a671-663a54b3b4df";
    private static final String EVIDENCE = "11111111-1111-4111-8111-111111111111";
    private static final String TRADER_EVIDENCE = "22222222-2222-4222-8222-222222222222";
    private static final String FARMER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String TRADER = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    private static final String ADMIN = "00000000-0000-0000-0000-000000000001";
    private static final Instant NOW = Instant.parse("2026-10-19T00:00:00Z");
    private DisputeRepository disputes;
    private DisputeEvidenceRepository evidence;
    private DisputeSettlementRepository settlements;
    private ContractRepository contracts;
    private PaymentTrackingRepository tracking;
    private ReputationDecisionOutboxRepository reputationOutbox;
    private CompletionRewardRepository rewards;
    private DisputeSettlementService service;

    @BeforeEach
    void setUp() {
        disputes = mock(DisputeRepository.class);
        evidence = mock(DisputeEvidenceRepository.class);
        settlements = mock(DisputeSettlementRepository.class);
        contracts = mock(ContractRepository.class);
        tracking = mock(PaymentTrackingRepository.class);
        reputationOutbox = mock(ReputationDecisionOutboxRepository.class);
        rewards = mock(CompletionRewardRepository.class);
        service = new DisputeSettlementService(disputes, evidence, settlements,
                contracts, tracking, mock(ContractOutboxRepository.class),
                mock(DepositOutboxRepository.class), reputationOutbox, rewards,
                Clock.fixed(NOW, ZoneOffset.UTC));
        Contract contract = new Contract(CONTRACT, "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0", FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", NOW.plusSeconds(86400),
                "ACTIVE", new BigDecimal("20.00"), null, 3, NOW, NOW);
        Dispute dispute = new Dispute(DISPUTE, CONTRACT, FARMER, "DELIVERY", "Details",
                "UNDER_REVIEW", true, ADMIN, NOW.plusSeconds(172800), null, null,
                2, 0, NOW, NOW);
        when(disputes.findById(DISPUTE)).thenReturn(Optional.of(dispute));
        when(disputes.findByIdForUpdate(DISPUTE)).thenReturn(Optional.of(dispute));
        when(contracts.findByIdForUpdate(CONTRACT)).thenReturn(Optional.of(contract));
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(contract));
        when(tracking.findByContractIdForUpdate(CONTRACT)).thenReturn(Optional.of(deposit("LOCKED")));
        when(tracking.findByContractId(CONTRACT)).thenReturn(Optional.of(deposit("LOCKED")));
        when(evidence.belongsToDispute(EVIDENCE, DISPUTE)).thenReturn(true);
    }

    @Test
    void farmerViolationRefundsOnceAndRecordsTwentyPercentObligation() {
        service.settle(DISPUTE, DECISION, DECISION, ADMIN, 2, "FARMER_VIOLATION",
                "REFUND_TO_TRADER", "Verified", List.of(EVIDENCE), FARMER, "F04", "3.0");
        verify(contracts).markCancelled(CONTRACT, 4, NOW);
        verify(tracking).settleDispute(CONTRACT, "REFUNDED", 3, NOW);
        verify(settlements).insert(eq(DECISION), any(), eq(CONTRACT), eq(ADMIN), eq(FARMER),
                eq("F04"), eq(new BigDecimal("3.0")), eq(TRADER), eq("REFUND_TO_TRADER"),
                eq(new BigDecimal("500001.00")), eq(new BigDecimal("20.00")),
                eq(new BigDecimal("100000.20")), eq(NOW));
        verify(reputationOutbox).penalty(any(), eq(DECISION), eq(1L), eq(FARMER),
                eq("F04"), eq(new BigDecimal("3.0")), eq(ADMIN), eq(NOW));
    }

    @Test
    void traderViolationForfeitsWithoutFarmerPenalty() {
        service.settle(DISPUTE, DECISION, DECISION, ADMIN, 2, "TRADER_VIOLATION",
                "FORFEIT_TO_FARMER", "Verified", List.of(EVIDENCE), TRADER, "T04", "3.0");
        verify(tracking).settleDispute(CONTRACT, "FORFEITED", 3, NOW);
        verify(settlements).insert(eq(DECISION), any(), eq(CONTRACT), eq(ADMIN), eq(TRADER),
                eq("T04"), eq(new BigDecimal("3.0")), eq(FARMER), eq("FORFEIT_TO_FARMER"),
                eq(new BigDecimal("500001.00")), eq(BigDecimal.ZERO),
                eq(new BigDecimal("0.00")), eq(NOW));
        verify(reputationOutbox).penalty(any(), eq(DECISION), eq(1L), eq(TRADER),
                eq("T04"), eq(new BigDecimal("3.0")), eq(ADMIN), eq(NOW));
    }

    @Test
    void releasedDepositCannotBeSettledAgain() {
        when(tracking.findByContractIdForUpdate(CONTRACT))
                .thenReturn(Optional.of(deposit("RELEASED")));
        assertThrows(IllegalStateException.class, () -> service.settle(DISPUTE, DECISION,
                DECISION, ADMIN, 2, "FARMER_VIOLATION", "REFUND_TO_TRADER",
                "Verified", List.of(EVIDENCE), FARMER, "F04", "3.0"));
        verify(settlements, never()).insert(any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), any(), any(), any());
        verify(reputationOutbox, never()).penalty(any(), any(), anyLong(),
                any(), any(), any(), any(), any());
    }

    @Test
    void noEvidenceOrWrongLiablePartyIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.settle(DISPUTE, DECISION,
                DECISION, ADMIN, 2, "FARMER_VIOLATION", "REFUND_TO_TRADER",
                "Verified", List.of(), FARMER, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.settle(DISPUTE, DECISION,
                DECISION, ADMIN, 2, "FARMER_VIOLATION", "REFUND_TO_TRADER",
                "Verified", List.of(EVIDENCE), TRADER, null, null));
    }

    @Test
    void wrongOrMissingReputationPenaltyIsRejectedBeforeSettlement() {
        assertThrows(IllegalArgumentException.class, () -> service.settle(DISPUTE, DECISION,
                DECISION, ADMIN, 2, "FARMER_VIOLATION", "REFUND_TO_TRADER",
                "Verified", List.of(EVIDENCE), FARMER, "F04", "2.0"));
        assertThrows(IllegalArgumentException.class, () -> service.settle(DISPUTE, DECISION,
                DECISION, ADMIN, 2, "TRADER_VIOLATION", "FORFEIT_TO_FARMER",
                "Verified", List.of(EVIDENCE), TRADER, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.settle(DISPUTE, DECISION,
                DECISION, ADMIN, 2, "TRADER_VIOLATION", "FORFEIT_TO_FARMER",
                "Verified", List.of(EVIDENCE), TRADER, "F04", "3.0"));
        verify(reputationOutbox, never()).penalty(any(), any(), anyLong(),
                any(), any(), any(), any(), any());
    }

    @Test
    void numericFormattingOnRetryDoesNotCreateAnotherPenalty() {
        when(disputes.findDecision(DECISION)).thenReturn(Optional.of(new DisputeDecision(
                DECISION, DISPUTE, ADMIN, 2, "FARMER_VIOLATION", "REFUND_TO_TRADER",
                "Verified", List.of(EVIDENCE))));
        when(settlements.findTerms(DECISION)).thenReturn(Optional.of(
                new DisputeSettlementRepository.SettlementTerms(FARMER, "F04",
                        new BigDecimal("3.0"))));
        service.settle(DISPUTE, DECISION, DECISION, ADMIN, 2, "FARMER_VIOLATION",
                "REFUND_TO_TRADER", "Verified", List.of(EVIDENCE), FARMER, "F04", "3");
        verify(reputationOutbox, never()).penalty(any(), any(), anyLong(),
                any(), any(), any(), any(), any());
    }

    @Test
    void mutualCancellationRequiresEachParticipantAndRefundsWithoutPenalty() {
        when(evidence.belongsTo(EVIDENCE, DISPUTE, FARMER)).thenReturn(true);
        when(evidence.belongsTo(TRADER_EVIDENCE, DISPUTE, TRADER)).thenReturn(true);
        service.cancelMutually(DISPUTE, DECISION, DECISION, ADMIN, 2,
                "REFUND_TO_TRADER", "Both agree to cancel",
                List.of(EVIDENCE, TRADER_EVIDENCE), null, null, null);
        verify(contracts).markCancelled(CONTRACT, 4, NOW);
        verify(tracking).settleDispute(CONTRACT, "REFUNDED", 3, NOW);
        verify(settlements).insert(eq(DECISION), any(), eq(CONTRACT), eq(ADMIN),
                eq(null), eq(null), eq(null), eq(TRADER), eq("REFUND_TO_TRADER"),
                eq(new BigDecimal("500001.00")), eq(BigDecimal.ZERO),
                eq(BigDecimal.ZERO), eq(NOW));
    }

    @Test
    void mutualCancellationRejectsOneSidedEvidenceAndPenalty() {
        when(evidence.belongsTo(EVIDENCE, DISPUTE, FARMER)).thenReturn(true);
        when(evidence.belongsTo(TRADER_EVIDENCE, DISPUTE, FARMER)).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.cancelMutually(
                DISPUTE, DECISION, DECISION, ADMIN, 2, "REFUND_TO_TRADER",
                "Both agree", List.of(EVIDENCE, TRADER_EVIDENCE), null, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.cancelMutually(
                DISPUTE, DECISION, DECISION, ADMIN, 2, "REFUND_TO_TRADER",
                "Both agree", List.of(EVIDENCE, TRADER_EVIDENCE), FARMER, null, null));
        verify(settlements, never()).insert(any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void postReleaseFarmerViolationRevokesCompletionRewardsAndEmitsPenalty() {
        Contract completed = new Contract(CONTRACT, "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0", FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", NOW.minusSeconds(86400 * 4),
                "COMPLETED", new BigDecimal("20.00"), NOW.minusSeconds(86400 * 3), 4, NOW, NOW);
        Dispute lateDispute = new Dispute(DISPUTE, CONTRACT, TRADER, "LATE_COMPLAINT", "Details",
                "UNDER_REVIEW", false, ADMIN, NOW.plusSeconds(172800), null, null,
                2, 0, NOW, NOW);
        PaymentTracking released = deposit("RELEASED", false);
        when(contracts.findByIdForUpdate(CONTRACT)).thenReturn(Optional.of(completed));
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(completed));
        when(disputes.findById(DISPUTE)).thenReturn(Optional.of(lateDispute));
        when(disputes.findByIdForUpdate(DISPUTE)).thenReturn(Optional.of(lateDispute));
        when(tracking.findByContractIdForUpdate(CONTRACT)).thenReturn(Optional.of(released));
        when(tracking.findByContractId(CONTRACT)).thenReturn(Optional.of(released));

        var unrevoked = List.of(
                new CompletionRewardRepository.UnrevokedReward(FARMER, "f-reward-id"),
                new CompletionRewardRepository.UnrevokedReward(TRADER, "t-reward-id"));
        when(rewards.revokeAllForContract(CONTRACT, DECISION, NOW)).thenReturn(unrevoked);

        service.settle(DISPUTE, DECISION, DECISION, ADMIN, 2, "FARMER_VIOLATION",
                "NONE", "Late violation verified", List.of(EVIDENCE), FARMER, "F04", "2.0");

        verify(contracts, never()).markCancelled(any(), anyLong(), any());
        verify(tracking, never()).settleDispute(any(), any(), anyLong(), any());
        verify(settlements).insert(eq(DECISION), eq(released.paymentTrackingId()), eq(CONTRACT),
                eq(ADMIN), eq(FARMER), eq("F04"), eq(new BigDecimal("2.0")), eq(TRADER),
                eq("NONE"), eq(released.depositAmount()), eq(BigDecimal.ZERO),
                eq(BigDecimal.ZERO), eq(NOW));
        verify(reputationOutbox).reverseCompletionReward(completed, "f-reward-id", FARMER, ADMIN, NOW);
        verify(reputationOutbox).reverseCompletionReward(completed, "t-reward-id", TRADER, ADMIN, NOW);
        verify(reputationOutbox).penalty(completed, DECISION, 1L, FARMER, "F04",
                new BigDecimal("2.0"), ADMIN, NOW);
    }

    @Test
    void postReleaseTraderViolationRevokesCompletionRewardsAndEmitsPenalty() {
        Contract completed = new Contract(CONTRACT, "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0", FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", NOW.minusSeconds(86400 * 4),
                "COMPLETED", new BigDecimal("20.00"), NOW.minusSeconds(86400 * 3), 4, NOW, NOW);
        Dispute lateDispute = new Dispute(DISPUTE, CONTRACT, FARMER, "LATE_COMPLAINT", "Details",
                "UNDER_REVIEW", false, ADMIN, NOW.plusSeconds(172800), null, null,
                2, 0, NOW, NOW);
        PaymentTracking released = deposit("RELEASED", false);
        when(contracts.findByIdForUpdate(CONTRACT)).thenReturn(Optional.of(completed));
        when(contracts.findById(CONTRACT)).thenReturn(Optional.of(completed));
        when(disputes.findById(DISPUTE)).thenReturn(Optional.of(lateDispute));
        when(disputes.findByIdForUpdate(DISPUTE)).thenReturn(Optional.of(lateDispute));
        when(tracking.findByContractIdForUpdate(CONTRACT)).thenReturn(Optional.of(released));
        when(tracking.findByContractId(CONTRACT)).thenReturn(Optional.of(released));

        var unrevoked = List.of(
                new CompletionRewardRepository.UnrevokedReward(TRADER, "t-reward-id"));
        when(rewards.revokeAllForContract(CONTRACT, DECISION, NOW)).thenReturn(unrevoked);

        service.settle(DISPUTE, DECISION, DECISION, ADMIN, 2, "TRADER_VIOLATION",
                "NONE", "Trader late violation", List.of(EVIDENCE), TRADER, "T04", "3.0");

        verify(contracts, never()).markCancelled(any(), anyLong(), any());
        verify(tracking, never()).settleDispute(any(), any(), anyLong(), any());
        verify(settlements).insert(eq(DECISION), eq(released.paymentTrackingId()), eq(CONTRACT),
                eq(ADMIN), eq(TRADER), eq("T04"), eq(new BigDecimal("3.0")), eq(FARMER),
                eq("NONE"), eq(released.depositAmount()), eq(BigDecimal.ZERO),
                eq(BigDecimal.ZERO), eq(NOW));
        verify(reputationOutbox).reverseCompletionReward(completed, "t-reward-id", TRADER, ADMIN, NOW);
        verify(reputationOutbox).penalty(completed, DECISION, 1L, TRADER, "T04",
                new BigDecimal("3.0"), ADMIN, NOW);
    }

    @Test
    void postReleaseRejectsRefundOrForfeitDisposition() {
        Contract completed = new Contract(CONTRACT, "202fe3fd-626a-41c8-80fd-70af82c1f256",
                "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0", FARMER, TRADER,
                new BigDecimal("10000010.00"), "Terms", NOW.minusSeconds(86400 * 4),
                "COMPLETED", new BigDecimal("20.00"), NOW.minusSeconds(86400 * 3), 4, NOW, NOW);
        Dispute lateDispute = new Dispute(DISPUTE, CONTRACT, TRADER, "LATE_COMPLAINT", "Details",
                "UNDER_REVIEW", false, ADMIN, NOW.plusSeconds(172800), null, null,
                2, 0, NOW, NOW);
        PaymentTracking released = deposit("RELEASED", false);
        when(contracts.findByIdForUpdate(CONTRACT)).thenReturn(Optional.of(completed));
        when(disputes.findById(DISPUTE)).thenReturn(Optional.of(lateDispute));
        when(disputes.findByIdForUpdate(DISPUTE)).thenReturn(Optional.of(lateDispute));
        when(tracking.findByContractIdForUpdate(CONTRACT)).thenReturn(Optional.of(released));

        assertThrows(IllegalStateException.class, () -> service.settle(DISPUTE, DECISION,
                DECISION, ADMIN, 2, "FARMER_VIOLATION", "REFUND_TO_TRADER",
                "Verified", List.of(EVIDENCE), FARMER, "F04", "3.0"));
    }

    @Test
    void continuingContractAcceptsNoneWithoutPayingDeposit() {
        service.settle(DISPUTE, DECISION, DECISION, ADMIN, 2, "FARMER_VIOLATION", "NONE",
                "Verified", List.of(EVIDENCE), FARMER, "F04", "2.0");
        verify(tracking).setDisputeHold(CONTRACT, false, NOW);
        verify(contracts, never()).markCancelled(any(), anyLong(), any());
        verify(tracking, never()).settleDispute(any(), any(), anyLong(), any());
    }

    @Test
    void idempotentPostReleaseDoesNotDuplicateReversalsOrPenalty() {
        when(disputes.findDecision(DECISION)).thenReturn(Optional.of(new DisputeDecision(
                DECISION, DISPUTE, ADMIN, 2, "FARMER_VIOLATION", "NONE",
                "Late violation verified", List.of(EVIDENCE))));
        when(settlements.findTerms(DECISION)).thenReturn(Optional.of(
                new DisputeSettlementRepository.SettlementTerms(FARMER, "F04",
                        new BigDecimal("3.0"))));

        service.settle(DISPUTE, DECISION, DECISION, ADMIN, 2, "FARMER_VIOLATION",
                "NONE", "Late violation verified", List.of(EVIDENCE), FARMER, "F04", "3.0");

        verify(rewards, never()).revokeAllForContract(any(), any(), any());
        verify(reputationOutbox, never()).reverseCompletionReward(any(), any(), any(), any(), any());
        verify(reputationOutbox, never()).penalty(any(), any(), anyLong(), any(), any(), any(), any(), any());
    }

    private PaymentTracking deposit(String status) {
        return deposit(status, true);
    }

    private PaymentTracking deposit(String status, boolean disputeHold) {
        return new PaymentTracking("e99f11f1-018b-4e7e-b267-c4def2e8505b", CONTRACT,
                new BigDecimal("5.00"), new BigDecimal("500001.00"), status, NOW,
                NOW.plusSeconds(86400), null, null, null, disputeHold, 2, NOW, NOW);
    }
}
