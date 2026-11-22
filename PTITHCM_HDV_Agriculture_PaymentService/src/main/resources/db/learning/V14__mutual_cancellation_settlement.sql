ALTER TABLE learning.dispute_settlements
    ALTER COLUMN liable_account_id DROP NOT NULL;

ALTER TABLE learning.dispute_settlements
    ADD CONSTRAINT mutual_cancellation_without_penalty CHECK (
        liable_account_id IS NOT NULL
        OR (disposition = 'REFUND_TO_TRADER'
            AND violation_code IS NULL
            AND penalty_points IS NULL
            AND penalty_rate = 0
            AND penalty_amount = 0)
    );
