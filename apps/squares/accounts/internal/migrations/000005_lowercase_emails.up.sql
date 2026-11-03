UPDATE users SET email = lower(email)
WHERE id IN (
    SELECT DISTINCT ON (lower(u.email)) u.id FROM users u
    WHERE u.email <> lower(u.email)
      AND NOT EXISTS (SELECT 1 FROM users o WHERE o.email = lower(u.email))
    ORDER BY lower(u.email), u.created_at NULLS LAST
);

UPDATE deleted_accounts SET email = lower(email)
WHERE email IN (
    SELECT DISTINCT ON (lower(d.email)) d.email FROM deleted_accounts d
    WHERE d.email <> lower(d.email)
      AND NOT EXISTS (SELECT 1 FROM deleted_accounts o WHERE o.email = lower(d.email))
    ORDER BY lower(d.email), d.deleted_at DESC
);
