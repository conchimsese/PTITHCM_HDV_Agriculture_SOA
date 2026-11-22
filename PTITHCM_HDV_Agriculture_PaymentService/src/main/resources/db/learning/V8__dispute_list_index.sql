CREATE INDEX disputes_list_idx ON learning.disputes
    (created_at DESC, dispute_id DESC);
