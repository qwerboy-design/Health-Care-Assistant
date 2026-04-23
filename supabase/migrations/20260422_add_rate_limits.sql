CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

COMMENT ON TABLE rate_limits IS 'Persistent rate limiting counters';
COMMENT ON COLUMN rate_limits.key IS 'Scoped rate limit key, e.g. ip:1.2.3.4 or email:user@example.com';

CREATE OR REPLACE FUNCTION consume_rate_limit(
    p_key TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    remaining INTEGER,
    reset_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_count INTEGER;
    v_reset_at TIMESTAMP WITH TIME ZONE;
BEGIN
    IF p_max_requests < 1 THEN
        RAISE EXCEPTION 'p_max_requests must be >= 1';
    END IF;

    IF p_window_seconds < 1 THEN
        RAISE EXCEPTION 'p_window_seconds must be >= 1';
    END IF;

    LOOP
        UPDATE rate_limits
        SET
            count = CASE
                WHEN rate_limits.reset_at <= v_now THEN 1
                ELSE rate_limits.count + 1
            END,
            reset_at = CASE
                WHEN rate_limits.reset_at <= v_now THEN v_now + make_interval(secs => p_window_seconds)
                ELSE rate_limits.reset_at
            END,
            updated_at = v_now
        WHERE rate_limits.key = p_key
        RETURNING rate_limits.count, rate_limits.reset_at
        INTO v_count, v_reset_at;

        IF FOUND THEN
            EXIT;
        END IF;

        BEGIN
            INSERT INTO rate_limits (key, count, reset_at, updated_at)
            VALUES (p_key, 1, v_now + make_interval(secs => p_window_seconds), v_now)
            RETURNING rate_limits.count, rate_limits.reset_at
            INTO v_count, v_reset_at;
            EXIT;
        EXCEPTION
            WHEN unique_violation THEN
                -- Another concurrent request inserted the same key first; retry.
        END;
    END LOOP;

    RETURN QUERY
    SELECT
        v_count <= p_max_requests,
        GREATEST(p_max_requests - v_count, 0),
        v_reset_at;
END;
$$;
