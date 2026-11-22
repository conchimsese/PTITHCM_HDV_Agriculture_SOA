ALTER TABLE learning.dispute_evidence
    ADD COLUMN source_account_id UUID;

CREATE INDEX dispute_evidence_list_idx ON learning.dispute_evidence
    (dispute_id,created_at DESC,evidence_id DESC);
