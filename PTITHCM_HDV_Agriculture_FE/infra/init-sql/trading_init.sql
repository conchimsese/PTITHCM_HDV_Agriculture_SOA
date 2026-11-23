-- Idempotent schema initialization for trading-service-soa (matches prisma/schema.prisma)

DO $$
BEGIN
    CREATE TYPE "ListingStatus" AS ENUM ('OPEN', 'LOCKED', 'SOLD');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TABLE IF NOT EXISTS listings (
    listing_id UUID PRIMARY KEY,
    farmer_id UUID NOT NULL,
    plot_id UUID NOT NULL,
    crop_season_id UUID NOT NULL,
    seed_type VARCHAR(100) NOT NULL,
    estimated_yield DECIMAL(12, 2) NOT NULL,
    area DECIMAL(12, 2) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    expected_price DECIMAL(18, 2) NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    status "ListingStatus" NOT NULL DEFAULT 'OPEN',
    winning_contract_id UUID,
    winning_payment_tracking_id UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offers (
    offer_id UUID PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES listings(listing_id),
    farmer_id UUID NOT NULL,
    trader_id UUID NOT NULL,
    offered_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    status "OfferStatus" NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmer_replicas (
    account_id UUID PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    province VARCHAR(100),
    district VARCHAR(100),
    joined_at TIMESTAMPTZ(6) NOT NULL,
    profile_version BIGINT NOT NULL DEFAULT 0,
    public_visible BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trader_replicas (
    account_id UUID PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    province VARCHAR(100),
    district VARCHAR(100),
    joined_at TIMESTAMPTZ(6) NOT NULL,
    profile_version BIGINT NOT NULL DEFAULT 0,
    public_visible BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outbox_events (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    partition_key VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    published_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS outbox_events_published_at_idx ON outbox_events(published_at);
