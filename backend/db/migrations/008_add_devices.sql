-- Migration 008: Add Device Management & FCM
-- ==========================================
-- Creates tables for user device registration and FCM token management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User devices table
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Device information
    platform VARCHAR(50) NOT NULL, -- ios, android, web
    device_model VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    
    -- FCM token
    fcm_token TEXT,
    
    -- Device status
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_device_token UNIQUE (user_id, fcm_token)
);

-- Indexes for performance
CREATE INDEX idx_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_devices_platform ON user_devices(platform);
CREATE INDEX idx_devices_active ON user_devices(is_active);
CREATE INDEX idx_devices_last_seen ON user_devices(last_seen_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_devices_updated_at
    BEFORE UPDATE ON user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_devices_updated_at();

-- Function to update last_seen_at
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_device_last_seen
    BEFORE UPDATE ON user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_device_last_seen();

-- Row Level Security (RLS)
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Users can only access their own devices
CREATE POLICY "Users can view own devices"
    ON user_devices FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own devices"
    ON user_devices FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own devices"
    ON user_devices FOR UPDATE
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own devices"
    ON user_devices FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Admin can access all devices (if needed)
CREATE POLICY "Admin can view all devices"
    ON user_devices FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::text 
        AND user_type = 'admin'
    ));

-- Function to get user active devices
CREATE OR REPLACE FUNCTION get_user_active_devices(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    platform VARCHAR(50),
    device_model VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    is_active BOOLEAN,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        platform,
        device_model,
        os_version,
        app_version,
        is_active,
        last_seen_at,
        created_at
    FROM user_devices
    WHERE user_id = p_user_id
    AND is_active = true
    ORDER BY last_seen_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate old devices (keep only last 5 active)
CREATE OR REPLACE FUNCTION deactivate_old_devices(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM user_devices
    WHERE id IN (
        SELECT id FROM user_devices
        WHERE user_id = p_user_id
        AND is_active = true
        ORDER BY last_seen_at DESC
        OFFSET 5
    );
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE user_devices IS 'Stores user device information and FCM tokens for push notifications';
