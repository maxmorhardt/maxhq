-- hand the tables back to public so the pre-split monolith can run again
ALTER TABLE contest_invites SET SCHEMA public;
ALTER TABLE contest_participants SET SCHEMA public;
ALTER TABLE quarter_results SET SCHEMA public;
ALTER TABLE squares SET SCHEMA public;
ALTER TABLE contests SET SCHEMA public;
