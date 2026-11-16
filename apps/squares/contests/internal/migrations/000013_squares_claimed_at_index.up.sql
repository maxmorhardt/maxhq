-- the landing stats count recent claims; unclaimed squares stay out of the index
CREATE INDEX IF NOT EXISTS idx_squares_claimed_at ON squares (claimed_at) WHERE claimed_at IS NOT NULL;
