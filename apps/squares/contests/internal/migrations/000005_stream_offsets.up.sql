-- how far each stream consumer has read; saved after every batch so a restart resumes where it stopped
CREATE TABLE IF NOT EXISTS stream_offsets (
    consumer   text PRIMARY KEY,
    last_id    text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
