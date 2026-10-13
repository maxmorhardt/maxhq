-- adopt the tables the pre-split monolith created in public, on the first boot after the split
DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL AND to_regclass('accounts.users') IS NULL THEN
        ALTER TABLE public.users SET SCHEMA accounts;
    END IF;
    IF to_regclass('public.deleted_accounts') IS NOT NULL AND to_regclass('accounts.deleted_accounts') IS NULL THEN
        ALTER TABLE public.deleted_accounts SET SCHEMA accounts;
    END IF;
    IF to_regclass('public.contact_submissions') IS NOT NULL AND to_regclass('accounts.contact_submissions') IS NULL THEN
        ALTER TABLE public.contact_submissions SET SCHEMA accounts;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    display_name text NOT NULL DEFAULT '',
    default_initials text NOT NULL DEFAULT '',
    created_at timestamptz,
    updated_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS deleted_accounts (
    email      text PRIMARY KEY,
    deleted_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_submissions (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL,
    email varchar(255) NOT NULL,
    subject varchar(200) NOT NULL,
    message text NOT NULL,
    ip_address varchar(45),
    status varchar(20) DEFAULT 'pending',
    response text,
    created_at timestamptz,
    updated_at timestamptz
);
