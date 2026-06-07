CREATE TABLE programs (
    id          BIGSERIAL    PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL,
    country     VARCHAR(100) NOT NULL,
    type        VARCHAR(50)  NOT NULL,
    deadline    DATE,
    url         VARCHAR(500),
    status      VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programs_type    ON programs(type);
CREATE INDEX idx_programs_country ON programs(country);
CREATE INDEX idx_programs_status  ON programs(status);
