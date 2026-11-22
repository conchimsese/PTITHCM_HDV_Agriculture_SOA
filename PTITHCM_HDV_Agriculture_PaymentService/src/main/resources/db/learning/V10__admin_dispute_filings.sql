CREATE TABLE learning.admin_dispute_filings (
    dispute_id UUID PRIMARY KEY REFERENCES learning.disputes(dispute_id),
    admin_id UUID NOT NULL,
    on_behalf_of_account_id UUID NOT NULL,
    verification_note TEXT NOT NULL CHECK (length(btrim(verification_note)) > 0),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX admin_dispute_filings_admin_idx
    ON learning.admin_dispute_filings (admin_id,created_at DESC);
