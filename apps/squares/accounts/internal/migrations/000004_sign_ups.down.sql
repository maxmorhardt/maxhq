ALTER TABLE deleted_accounts DROP COLUMN IF EXISTS restored_at;
ALTER TABLE users DROP COLUMN IF EXISTS signed_up_at;
