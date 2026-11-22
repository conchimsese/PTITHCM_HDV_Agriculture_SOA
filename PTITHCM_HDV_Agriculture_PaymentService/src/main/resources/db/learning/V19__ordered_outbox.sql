CREATE SEQUENCE learning.outbox_relay_sequence;
ALTER TABLE learning.outbox ADD COLUMN relay_sequence BIGINT;

-- Existing events retain their chronological order; lifecycle versions break timestamp ties.
WITH ordered AS (
    SELECT event_id, row_number() OVER (
        ORDER BY created_at,
            CASE WHEN event_type = 'CONTRACT_CREATED' THEN 0 ELSE 1 END,
            COALESCE((payload->'data'->>'stateVersion')::bigint, 0), event_id
    ) AS position FROM learning.outbox
)
UPDATE learning.outbox o SET relay_sequence = ordered.position
FROM ordered WHERE ordered.event_id = o.event_id;
SELECT setval('learning.outbox_relay_sequence',
    COALESCE((SELECT max(relay_sequence) FROM learning.outbox), 0) + 1, false);
ALTER TABLE learning.outbox ALTER COLUMN relay_sequence
    SET DEFAULT nextval('learning.outbox_relay_sequence');
ALTER SEQUENCE learning.outbox_relay_sequence OWNED BY learning.outbox.relay_sequence;
ALTER TABLE learning.outbox ALTER COLUMN relay_sequence SET NOT NULL;
CREATE UNIQUE INDEX outbox_relay_sequence_idx ON learning.outbox(relay_sequence);
CREATE INDEX outbox_pending_aggregate_sequence_idx
    ON learning.outbox(aggregate_id, relay_sequence) WHERE published_at IS NULL;
