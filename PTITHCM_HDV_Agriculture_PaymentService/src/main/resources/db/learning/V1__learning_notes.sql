CREATE SCHEMA IF NOT EXISTS learning;
CREATE TABLE learning.notes (
    id UUID PRIMARY KEY,
    content VARCHAR(4000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

