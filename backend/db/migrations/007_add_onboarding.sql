-- Migration 007: Add Onboarding System
-- ===================================
-- Creates tables for user onboarding persistence

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Onboarding table
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- User preferences from onboarding
    favorite_countries TEXT[] DEFAULT '{}',
    favorite_teams TEXT[] DEFAULT '{}',
    favorite_competitions TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    
    -- User mode and experience
    user_mode VARCHAR(50) DEFAULT 'viewer', -- viewer, predictor, analyst
    experience_level VARCHAR(50) DEFAULT 'casual', -- casual, regular, hardcore
    
    -- Notifications preference
    notifications_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    onboarding_version VARCHAR(20) DEFAULT '1.0',
    completed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_onboarding UNIQUE (user_id)
);

-- Indexes for performance
CREATE INDEX idx_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX idx_onboarding_completed ON user_onboarding(is_completed);
CREATE INDEX idx_onboarding_countries ON user_onboarding USING GIN(favorite_countries);
CREATE INDEX idx_onboarding_teams ON user_onboarding USING GIN(favorite_teams);
CREATE INDEX idx_onboarding_competitions ON user_onboarding USING GIN(favorite_competitions);
CREATE INDEX idx_onboarding_interests ON user_onboarding USING GIN(interests);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_onboarding_updated_at
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_updated_at();

-- Row Level Security (RLS)
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Users can only access their own onboarding data
CREATE POLICY "Users can view own onboarding"
    ON user_onboarding FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own onboarding"
    ON user_onboarding FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own onboarding"
    ON user_onboarding FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- Admin can access all onboarding data (if needed)
CREATE POLICY "Admin can view all onboarding"
    ON user_onboarding FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::text 
        AND user_type = 'admin'
    ));

-- Function to track onboarding completion rate
CREATE OR REPLACE FUNCTION get_onboarding_completion_rate()
RETURNS TABLE (
    total_users BIGINT,
    completed_users BIGINT,
    completion_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT o.user_id) as completed_users,
        ROUND(
            (COUNT(DISTINCT o.user_id)::DECIMAL / NULLIF(COUNT(DISTINCT u.id), 0)) * 100,
            2
        ) as completion_rate
    FROM users u
    LEFT JOIN user_onboarding o ON u.id = o.user_id AND o.is_completed = true;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE user_onboarding IS 'Stores user onboarding preferences and completion status';
