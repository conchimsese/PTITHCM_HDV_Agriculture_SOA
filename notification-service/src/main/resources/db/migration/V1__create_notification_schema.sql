CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    source_service VARCHAR(50) NOT NULL,
    source_event VARCHAR(50) NOT NULL,
    reference_type VARCHAR(30) NOT NULL,
    reference_id UUID NOT NULL,
    status VARCHAR(10) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    read_at TIMESTAMPTZ,
    CONSTRAINT uq_notifications_event_recipient UNIQUE (event_id, recipient_id),
    CONSTRAINT ck_notifications_type CHECK (type IN (
        'OFFER_CREATED', 'OFFER_ACCEPTED', 'MESSAGE_CREATED',
        'CONTRACT_CREATED', 'CONTRACT_STATUS_CHANGED', 'DEPOSIT_PAID',
        'DEPOSIT_STATUS_CHANGED', 'REPUTATION_CHANGED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED'
    )),
    CONSTRAINT ck_notifications_reference_type CHECK (
        reference_type IN ('OFFER', 'CONVERSATION', 'CONTRACT', 'DEPOSIT', 'ACCOUNT')
    ),
    CONSTRAINT ck_notifications_read_state CHECK (
        (status = 'UNREAD' AND read_at IS NULL) OR (status = 'READ' AND read_at IS NOT NULL)
    )
);

CREATE INDEX idx_notifications_recipient_created
    ON notifications (recipient_id, created_at DESC, notification_id DESC);
CREATE INDEX idx_notifications_unread
    ON notifications (recipient_id, created_at) WHERE status = 'UNREAD';
CREATE INDEX idx_notifications_created ON notifications (created_at);

-- No FK: receipts must survive deletion of notification content.
CREATE TABLE notification_receipts (
    event_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    CONSTRAINT pk_notification_receipts PRIMARY KEY (event_id, recipient_id)
);
