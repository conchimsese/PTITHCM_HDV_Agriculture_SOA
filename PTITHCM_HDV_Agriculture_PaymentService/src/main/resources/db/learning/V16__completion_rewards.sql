CREATE TABLE learning.completion_rewards (
    contract_id UUID NOT NULL REFERENCES learning.contracts(contract_id),
    account_id UUID NOT NULL,
    decision_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (contract_id, account_id)
);

CREATE INDEX completed_reward_due_idx ON learning.contracts (completed_confirmed_at, contract_id)
    WHERE status='COMPLETED' AND completed_confirmed_at IS NOT NULL;
