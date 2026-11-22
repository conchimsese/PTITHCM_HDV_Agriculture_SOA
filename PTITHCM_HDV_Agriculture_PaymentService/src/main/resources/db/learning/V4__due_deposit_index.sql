CREATE INDEX payment_tracking_due_idx
ON learning.payment_tracking (delivery_date, payment_tracking_id)
WHERE status = 'LOCKED' AND dispute_hold = false;
