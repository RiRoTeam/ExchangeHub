CREATE TABLE program_analytics_daily (
    program_id  BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    event_date  DATE NOT NULL,
    view_count  BIGINT NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    click_count BIGINT NOT NULL DEFAULT 0 CHECK (click_count >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (program_id, event_date)
);

CREATE INDEX idx_program_analytics_daily_date
    ON program_analytics_daily (event_date);
