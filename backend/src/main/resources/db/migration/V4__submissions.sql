CREATE TABLE submissions (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT         NOT NULL,
    country       VARCHAR(100) NOT NULL,
    type          VARCHAR(50)  NOT NULL,
    deadline      DATE,
    url           VARCHAR(500),
    status        VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    admin_comment TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    reviewed_at   TIMESTAMP
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_status  ON submissions(status);
