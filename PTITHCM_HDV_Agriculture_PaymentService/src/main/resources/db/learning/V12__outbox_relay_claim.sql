ALTER TABLE learning.outbox
    ADD COLUMN claimed_by UUID,
    ADD COLUMN lease_until TIMESTAMPTZ,
    ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0);

CREATE INDEX outbox_relay_due_idx ON learning.outbox (lease_until, created_at, event_id)
    WHERE published_at IS NULL;
