-- hand the tables back to public so the pre-split monolith can run again
ALTER TABLE contact_submissions SET SCHEMA public;
ALTER TABLE deleted_accounts SET SCHEMA public;
ALTER TABLE users SET SCHEMA public;
