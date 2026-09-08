-- Existing rows contain bearer credentials in plaintext. Revoke them once;
-- new application versions store SHA-256 digests in the same column.
UPDATE refresh_tokens SET revoked = TRUE WHERE revoked = FALSE;
ALTER TABLE refresh_tokens ALTER COLUMN token TYPE VARCHAR(64);

CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
