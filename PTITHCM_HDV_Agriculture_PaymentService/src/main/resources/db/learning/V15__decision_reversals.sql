CREATE TABLE learning.decision_reversals (
    reversal_decision_id UUID PRIMARY KEY,
    original_decision_id UUID NOT NULL UNIQUE REFERENCES learning.dispute_decisions(decision_id),
    dispute_id UUID NOT NULL REFERENCES learning.disputes(dispute_id),
    admin_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
    evidence_refs UUID[] NOT NULL CHECK (cardinality(evidence_refs) BETWEEN 1 AND 20),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT reversal_id_differs CHECK (reversal_decision_id <> original_decision_id)
);

CREATE INDEX decision_reversals_dispute_idx
    ON learning.decision_reversals (dispute_id);
