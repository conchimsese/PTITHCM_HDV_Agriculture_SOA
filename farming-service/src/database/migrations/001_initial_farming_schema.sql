-- ====================================================================
-- FARMING SERVICE INITIAL DATABASE SCHEMA MIGRATION
-- Rice Only • PostgreSQL • Node.js + Express.js
-- Core entities: plots, crop_seasons, farming_logs, costs
-- ====================================================================

-- 1. Enable pgcrypto extension for UUID generation if not present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Table: plots (Thửa ruộng / Lô đất trồng lúa)
CREATE TABLE IF NOT EXISTS plots (
    plot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL, -- Logical soft FK to User Service accounts
    name VARCHAR(100) NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_plots_area CHECK (area > 0),
    CONSTRAINT chk_plots_latitude CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    CONSTRAINT chk_plots_longitude CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);

-- 3. Table: crop_seasons (Mùa vụ canh tác lúa)
CREATE TABLE IF NOT EXISTS crop_seasons (
    crop_season_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES plots(plot_id) ON DELETE RESTRICT,
    season_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    crop_type VARCHAR(100) NOT NULL, -- Giống lúa (bắt buộc khi tạo mùa vụ mới)
    expected_yield DECIMAL(10,2), -- Sản lượng kỳ vọng (kg)
    actual_yield DECIMAL(10,2),   -- Sản lượng thực tế (kg)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_crop_seasons_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT chk_crop_seasons_expected_yield CHECK (expected_yield IS NULL OR expected_yield >= 0),
    CONSTRAINT chk_crop_seasons_actual_yield CHECK (actual_yield IS NULL OR actual_yield >= 0)
);

-- 4. Table: farming_logs (Nhật ký hoạt động canh tác)
CREATE TABLE IF NOT EXISTS farming_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_season_id UUID NOT NULL REFERENCES crop_seasons(crop_season_id) ON DELETE RESTRICT,
    work_type VARCHAR(30) NOT NULL,
    work_date DATE NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2),
    unit VARCHAR(20),
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_farming_logs_work_type CHECK (
        work_type IN (
            'LAND_PREPARATION',
            'PLANTING',
            'PEST_CONTROL',
            'WATERING',
            'FERTILIZING',
            'HARVESTING'
        )
    ),
    CONSTRAINT chk_farming_logs_quantity CHECK (quantity IS NULL OR quantity >= 0)
);

-- 5. Table: costs (Chi phí canh tác vụ lúa)
CREATE TABLE IF NOT EXISTS costs (
    cost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_season_id UUID NOT NULL REFERENCES crop_seasons(crop_season_id) ON DELETE RESTRICT,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    incurred_date DATE NOT NULL,
    description TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_costs_amount CHECK (amount >= 0)
);

-- ====================================================================
-- PERFORMANCE & FILTER INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_plots_farmer_visible ON plots(farmer_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_plots_created_at_id ON plots(created_at DESC, plot_id DESC);
CREATE INDEX IF NOT EXISTS idx_crop_seasons_plot ON crop_seasons(plot_id);
CREATE INDEX IF NOT EXISTS idx_farming_logs_season_visible ON farming_logs(crop_season_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_costs_season_visible ON costs(crop_season_id, is_visible);
