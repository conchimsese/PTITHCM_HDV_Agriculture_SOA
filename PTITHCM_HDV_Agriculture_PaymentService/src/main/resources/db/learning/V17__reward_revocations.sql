ALTER TABLE learning.completion_rewards
    ADD COLUMN revoked_at TIMESTAMPTZ,
    ADD COLUMN revoked_by_decision_id UUID REFERENCES learning.dispute_decisions(decision_id);

ALTER TABLE learning.dispute_settlements
    DROP CONSTRAINT IF EXISTS dispute_settlements_disposition_check;

ALTER TABLE learning.dispute_settlements
    ADD CONSTRAINT dispute_settlements_disposition_check
        CHECK (disposition IN ('FORFEIT_TO_FARMER','REFUND_TO_TRADER','NONE'));
