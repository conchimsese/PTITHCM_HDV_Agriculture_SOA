CREATE TABLE learning.dispute_settlements (
    decision_id UUID PRIMARY KEY REFERENCES learning.dispute_decisions(decision_id),
    payment_tracking_id UUID NOT NULL UNIQUE REFERENCES learning.payment_tracking(payment_tracking_id),
    contract_id UUID NOT NULL REFERENCES learning.contracts(contract_id),
    admin_id UUID NOT NULL,
    liable_account_id UUID NOT NULL,
    violation_code VARCHAR(40),
    penalty_points NUMERIC(3,1) CHECK (penalty_points > 0),
    beneficiary_id UUID NOT NULL,
    disposition VARCHAR(40) NOT NULL CHECK (disposition IN ('FORFEIT_TO_FARMER','REFUND_TO_TRADER')),
    deposit_amount NUMERIC(15,2) NOT NULL CHECK (deposit_amount > 0),
    penalty_rate NUMERIC(5,2) NOT NULL CHECK (penalty_rate >= 0),
    penalty_amount NUMERIC(15,2) NOT NULL CHECK (penalty_amount >= 0),
    settled_at TIMESTAMPTZ NOT NULL
);
