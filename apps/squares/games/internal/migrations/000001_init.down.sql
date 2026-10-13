-- hand the tables back to public so the pre-split monolith can run again
ALTER TABLE game_scores SET SCHEMA public;
ALTER TABLE games SET SCHEMA public;
