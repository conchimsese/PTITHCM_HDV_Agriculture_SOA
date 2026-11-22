CREATE TABLE learning.dispute_evidence (
    evidence_id UUID PRIMARY KEY,
    dispute_id UUID NOT NULL REFERENCES learning.disputes(dispute_id),
    uploader_id UUID NOT NULL,
    storage_key UUID NOT NULL UNIQUE,
    content_type VARCHAR(30) NOT NULL CHECK (content_type IN ('image/jpeg','image/png')),
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    sha256 CHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    attached_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX dispute_evidence_dispute_idx ON learning.dispute_evidence (dispute_id,created_at);

CREATE TABLE learning.dispute_responses (
    response_id UUID PRIMARY KEY,
    dispute_id UUID NOT NULL REFERENCES learning.disputes(dispute_id),
    account_id UUID NOT NULL,
    statement TEXT NOT NULL CHECK (length(btrim(statement)) > 0),
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX dispute_responses_dispute_idx ON learning.dispute_responses (dispute_id,created_at);
