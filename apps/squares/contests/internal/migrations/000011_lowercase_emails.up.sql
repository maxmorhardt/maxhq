UPDATE users SET email = lower(email)
WHERE id IN (
    SELECT DISTINCT ON (lower(u.email)) u.id FROM users u
    WHERE u.email <> lower(u.email)
      AND NOT EXISTS (SELECT 1 FROM users o WHERE o.email = lower(u.email))
    ORDER BY lower(u.email), u.created_at NULLS LAST
);

UPDATE contest_participants SET user_id = lower(user_id)
WHERE id IN (
    SELECT DISTINCT ON (p.contest_id, lower(p.user_id)) p.id FROM contest_participants p
    WHERE p.user_id <> lower(p.user_id)
      AND NOT EXISTS (SELECT 1 FROM contest_participants o WHERE o.contest_id = p.contest_id AND o.user_id = lower(p.user_id))
    ORDER BY p.contest_id, lower(p.user_id), p.joined_at NULLS LAST
);

UPDATE contests SET owner = lower(owner) WHERE owner LIKE '%@%' AND owner <> lower(owner);
UPDATE contests SET created_by = lower(created_by) WHERE created_by LIKE '%@%' AND created_by <> lower(created_by);
UPDATE contests SET updated_by = lower(updated_by) WHERE updated_by LIKE '%@%' AND updated_by <> lower(updated_by);
UPDATE squares SET owner = lower(owner) WHERE owner LIKE '%@%' AND owner <> lower(owner);
UPDATE squares SET created_by = lower(created_by) WHERE created_by LIKE '%@%' AND created_by <> lower(created_by);
UPDATE squares SET updated_by = lower(updated_by) WHERE updated_by LIKE '%@%' AND updated_by <> lower(updated_by);
UPDATE quarter_results SET winner = lower(winner) WHERE winner LIKE '%@%' AND winner <> lower(winner);
UPDATE quarter_results SET created_by = lower(created_by) WHERE created_by LIKE '%@%' AND created_by <> lower(created_by);
UPDATE quarter_results SET updated_by = lower(updated_by) WHERE updated_by LIKE '%@%' AND updated_by <> lower(updated_by);
UPDATE contest_invites SET created_by = lower(created_by) WHERE created_by LIKE '%@%' AND created_by <> lower(created_by);
