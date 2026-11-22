CREATE INDEX contracts_farmer_id_idx ON learning.contracts (farmer_id);
CREATE INDEX contracts_trader_id_idx ON learning.contracts (trader_id);
CREATE INDEX payment_tracking_list_idx ON learning.payment_tracking
    (created_at DESC, payment_tracking_id DESC);
