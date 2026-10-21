UPDATE contests
SET status = 'DELETED', version = version + 1, updated_at = NOW()
WHERE game_id IS NULL AND status NOT IN ('FINISHED', 'DELETED');
