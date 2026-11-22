CREATE TABLE learning.admin_completions (
    contract_id UUID PRIMARY KEY REFERENCES learning.contracts(contract_id),
    dispute_id UUID NOT NULL REFERENCES learning.disputes(dispute_id),
    admin_id UUID NOT NULL,
    expected_version BIGINT NOT NULL,
    reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
    evidence_refs UUID[] NOT NULL CHECK (cardinality(evidence_refs) > 0),
    completed_at TIMESTAMPTZ NOT NULL
);
