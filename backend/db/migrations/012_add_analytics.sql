-- Migration 012: Add Analytics Events
-- ===================================
-- Creates table for analytics event tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(100),
    event_data JSONB,
    
    -- Context
    platform VARCHAR(50),
    app_version VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_event_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_platform ON analytics_events(platform);
CREATE INDEX idx_analytics_event_data ON analytics_events USING GIN(event_data);

-- Row Level Security (RLS)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can only access their own analytics events
CREATE POLICY "Users can view own analytics events"
    ON analytics_events FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own analytics events"
    ON analytics_events FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Admin can access all analytics events
CREATE POLICY "Admin can view all analytics events"
    ON analytics_events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::text 
        AND user_type = 'admin'
    ));

-- Function to get analytics stats
CREATE OR REPLACE FUNCTION get_analytics_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_events BIGINT,
    unique_events BIGINT,
    most_common_event VARCHAR(100),
    event_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT event_name) as unique_events,
        (SELECT event_name FROM analytics_events 
         WHERE user_id = p_user_id 
         AND created_at > NOW() - (p_days || ' days')::INTERVAL
         GROUP BY event_name 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as most_common_event,
        (SELECT COUNT(*) FROM analytics_events 
         WHERE user_id = p_user_id 
         AND created_at > NOW() - (p_days || ' days')::INTERVAL
         AND event_name = (SELECT event_name FROM analytics_events 
                          WHERE user_id = p_user_id 
                          AND created_at > NOW() - (p_days || ' days')::INTERVAL
                          GROUP BY event_name 
                          ORDER BY COUNT(*) DESC 
                          LIMIT 1)) as event_count
    FROM analytics_events
    WHERE user_id = p_user_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE analytics_events IS 'Stores analytics event data for user behavior tracking';
