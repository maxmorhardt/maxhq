CREATE TEMP TABLE identities AS
SELECT DISTINCT email FROM (
    SELECT email FROM users
    UNION SELECT user_id FROM contest_participants
    UNION SELECT owner FROM contests
    UNION SELECT created_by FROM contests
    UNION SELECT updated_by FROM contests
    UNION SELECT owner FROM squares
    UNION SELECT created_by FROM squares
    UNION SELECT updated_by FROM squares
    UNION SELECT winner FROM quarter_results
    UNION SELECT created_by FROM quarter_results
    UNION SELECT updated_by FROM quarter_results
    UNION SELECT created_by FROM contest_invites
) found (email)
WHERE email LIKE '%@%';

CREATE TEMP TABLE lowercased AS
SELECT min(email) AS email FROM identities
GROUP BY lower(email)
HAVING count(*) = 1 AND min(email) <> lower(min(email));

UPDATE users SET email = lower(email) WHERE email IN (SELECT email FROM lowercased);
UPDATE contest_participants SET user_id = lower(user_id) WHERE user_id IN (SELECT email FROM lowercased);
UPDATE contests SET owner = lower(owner) WHERE owner IN (SELECT email FROM lowercased);
UPDATE contests SET created_by = lower(created_by) WHERE created_by IN (SELECT email FROM lowercased);
UPDATE contests SET updated_by = lower(updated_by) WHERE updated_by IN (SELECT email FROM lowercased);
UPDATE squares SET owner = lower(owner) WHERE owner IN (SELECT email FROM lowercased);
UPDATE squares SET created_by = lower(created_by) WHERE created_by IN (SELECT email FROM lowercased);
UPDATE squares SET updated_by = lower(updated_by) WHERE updated_by IN (SELECT email FROM lowercased);
UPDATE quarter_results SET winner = lower(winner) WHERE winner IN (SELECT email FROM lowercased);
UPDATE quarter_results SET created_by = lower(created_by) WHERE created_by IN (SELECT email FROM lowercased);
UPDATE quarter_results SET updated_by = lower(updated_by) WHERE updated_by IN (SELECT email FROM lowercased);
UPDATE contest_invites SET created_by = lower(created_by) WHERE created_by IN (SELECT email FROM lowercased);

DROP TABLE lowercased;
DROP TABLE identities;
