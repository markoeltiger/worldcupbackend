-- Migration 010: Add World Cup Fan Profile
-- ========================================
-- Creates table for World Cup fan profile data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- World Cup fan profile table
CREATE TABLE IF NOT EXISTS world_cup_fan_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Fan profile fields
    favorite_player VARCHAR(255),
    favorite_legend VARCHAR(255),
    fan_since INTEGER, -- Year
    world_cups_watched INTEGER DEFAULT 0,
    favorite_world_cup_moment TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_fan_profile UNIQUE (user_id)
);

-- Indexes for performance
CREATE INDEX idx_fan_profile_user_id ON world_cup_fan_profiles(user_id);
CREATE INDEX idx_fan_profile_fan_since ON world_cup_fan_profiles(fan_since);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_fan_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fan_profile_updated_at
    BEFORE UPDATE ON world_cup_fan_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_fan_profile_updated_at();

-- Row Level Security (RLS)
ALTER TABLE world_cup_fan_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own fan profile
CREATE POLICY "Users can view own fan profile"
    ON world_cup_fan_profiles FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own fan profile"
    ON world_cup_fan_profiles FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own fan profile"
    ON world_cup_fan_profiles FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- Admin can access all fan profiles (if needed)
CREATE POLICY "Admin can view all fan profiles"
    ON world_cup_fan_profiles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::text 
        AND user_type = 'admin'
    ));

-- Comment on table
COMMENT ON TABLE world_cup_fan_profiles IS 'Stores World Cup fan profile information for users';
