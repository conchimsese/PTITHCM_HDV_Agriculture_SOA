CREATE TABLE learning.disputes (
    dispute_id UUID PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES learning.contracts(contract_id),
    opened_by UUID NOT NULL,
    reason_code VARCHAR(80) NOT NULL CHECK (length(btrim(reason_code)) > 0),
    description TEXT NOT NULL CHECK (length(btrim(description)) > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED')),
    deposit_hold BOOLEAN NOT NULL,
    assigned_admin_id UUID,
    response_due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    outcome VARCHAR(40),
    state_version BIGINT NOT NULL DEFAULT 1,
    decision_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX disputes_one_active_per_contract_idx ON learning.disputes (contract_id)
    WHERE status IN ('OPEN','UNDER_REVIEW');
CREATE INDEX disputes_contract_created_idx ON learning.disputes (contract_id,created_at DESC);

CREATE TABLE learning.dispute_reviews (
    review_id UUID PRIMARY KEY,
    dispute_id UUID NOT NULL REFERENCES learning.disputes(dispute_id),
    previous_admin_id UUID,
    admin_id UUID NOT NULL,
    note TEXT NOT NULL CHECK (length(btrim(note)) > 0),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE learning.dispute_decisions (
    decision_id UUID PRIMARY KEY,
    dispute_id UUID NOT NULL UNIQUE REFERENCES learning.disputes(dispute_id),
    admin_id UUID NOT NULL,
    expected_version BIGINT NOT NULL,
    outcome VARCHAR(40) NOT NULL,
    deposit_disposition VARCHAR(40) NOT NULL,
    reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
    evidence_refs UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL
);
