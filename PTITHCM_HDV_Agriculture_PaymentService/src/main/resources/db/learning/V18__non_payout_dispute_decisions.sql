-- NONE records an adjudication, not another payment. Preserve one actual payout per tracking.
ALTER TABLE learning.dispute_settlements
    DROP CONSTRAINT dispute_settlements_payment_tracking_id_key;
CREATE UNIQUE INDEX one_payout_per_tracking
    ON learning.dispute_settlements(payment_tracking_id)
    WHERE disposition <> 'NONE';
