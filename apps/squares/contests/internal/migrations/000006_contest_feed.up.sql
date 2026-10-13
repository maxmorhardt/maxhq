CREATE INDEX IF NOT EXISTS idx_contests_owner ON contests (owner);
CREATE INDEX IF NOT EXISTS idx_contests_updated_at_id ON contests (updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_contests_created_at_id ON contests (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_squares_contest_owner ON squares (contest_id, owner);
