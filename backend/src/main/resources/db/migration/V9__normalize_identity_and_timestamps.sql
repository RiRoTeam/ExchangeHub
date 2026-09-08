DO $$
BEGIN
    IF EXISTS (
        SELECT LOWER(BTRIM(email))
        FROM users
        GROUP BY LOWER(BTRIM(email))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize user emails: case-insensitive duplicates exist';
    END IF;
END $$;

UPDATE users SET email = LOWER(BTRIM(email));
CREATE UNIQUE INDEX ux_users_email_lower ON users (LOWER(email));

-- Java maps these values to Instant. Interpret historical values as UTC and
-- retain timezone semantics in PostgreSQL from this migration onward.
ALTER TABLE users
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE refresh_tokens
    ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
ALTER TABLE programs
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE submissions
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN reviewed_at TYPE TIMESTAMPTZ USING reviewed_at AT TIME ZONE 'UTC';
ALTER TABLE user_favorites
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE program_analytics
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
