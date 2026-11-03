CREATE TEMP TABLE lowercased AS
SELECT min(email) AS email FROM (
    SELECT email FROM users
    UNION SELECT email FROM deleted_accounts
) found (email)
GROUP BY lower(email)
HAVING count(*) = 1 AND min(email) <> lower(min(email));

UPDATE users SET email = lower(email) WHERE email IN (SELECT email FROM lowercased);
UPDATE deleted_accounts SET email = lower(email) WHERE email IN (SELECT email FROM lowercased);

DROP TABLE lowercased;
