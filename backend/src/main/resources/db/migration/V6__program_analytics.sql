CREATE TABLE program_analytics (
    program_id  BIGINT    PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
    view_count  BIGINT    NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    click_count BIGINT    NOT NULL DEFAULT 0 CHECK (click_count >= 0),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_program_analytics_engagement
    ON program_analytics ((view_count + click_count) DESC);
