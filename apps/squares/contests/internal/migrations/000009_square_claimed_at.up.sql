-- when a square was claimed, kept apart from updated_at, which initials changes and other cascades also move
ALTER TABLE squares ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
-- the best guess for squares claimed before the column existed
UPDATE squares SET claimed_at = updated_at WHERE value <> '' AND claimed_at IS NULL;
