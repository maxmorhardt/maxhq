ALTER TABLE users ADD COLUMN IF NOT EXISTS signed_up_at timestamptz;
ALTER TABLE deleted_accounts ADD COLUMN IF NOT EXISTS restored_at timestamptz;
