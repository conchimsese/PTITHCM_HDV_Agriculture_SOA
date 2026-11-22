CREATE TABLE learning.payment_tracking (
    payment_tracking_id UUID PRIMARY KEY,
    contract_id UUID NOT NULL UNIQUE REFERENCES learning.contracts(contract_id),
    deposit_rate NUMERIC(5,2) NOT NULL CHECK (deposit_rate = 5.00),
    deposit_amount NUMERIC(15,2) NOT NULL CHECK (deposit_amount > 0),
    status VARCHAR(30) NOT NULL CHECK (status IN
        ('PENDING','LOCKED','RELEASABLE','RELEASED','FORFEITED','REFUNDED')),
    paid_at TIMESTAMPTZ,
    delivery_date TIMESTAMPTZ NOT NULL,
    completed_confirmed_at TIMESTAMPTZ,
    release_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    dispute_hold BOOLEAN NOT NULL DEFAULT FALSE,
    state_version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE learning.outbox (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    aggregate_id UUID NOT NULL,
    topic VARCHAR(120) NOT NULL,
    event_key UUID NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ
);

CREATE INDEX outbox_unpublished_idx ON learning.outbox (created_at, event_id)
    WHERE published_at IS NULL;
