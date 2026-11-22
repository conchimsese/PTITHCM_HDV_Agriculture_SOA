CREATE TABLE learning.contracts (
    contract_id UUID PRIMARY KEY,
    offer_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    farmer_id UUID NOT NULL,
    trader_id UUID NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount > 0),
    terms TEXT NOT NULL CHECK (length(btrim(terms)) > 0),
    delivery_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('CREATED','PENDING_DEPOSIT','ACTIVE','COMPLETED','CANCELLED')),
    penalty_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (penalty_rate = 20.00),
    completed_confirmed_at TIMESTAMPTZ,
    state_version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CHECK (farmer_id <> trader_id)
);

CREATE INDEX contracts_offer_id_idx ON learning.contracts (offer_id);
