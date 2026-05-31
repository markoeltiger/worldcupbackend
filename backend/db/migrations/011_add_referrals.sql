-- Migration 011: Add Referral System
-- =================================
-- Creates tables for referral tracking and rewards

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, cancelled, fraud
    
    -- Reward
    reward_points INTEGER DEFAULT 0,
    reward_claimed_at TIMESTAMP WITH TIME ZONE,
    
    -- Fraud prevention
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_referrer_code UNIQUE (referrer_id, referral_code),
    CONSTRAINT unique_referred_user UNIQUE (referred_user_id)
);

-- Referral rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Reward details
    reward_type VARCHAR(50) NOT NULL, -- points, premium_days, badge
    reward_amount INTEGER NOT NULL,
    reward_description TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, claimed, expired
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_created_at ON referrals(created_at);
CREATE INDEX idx_referral_rewards_referral_id ON referral_rewards(referral_id);
CREATE INDEX idx_referral_rewards_user_id ON referral_rewards(user_id);
CREATE INDEX idx_referral_rewards_status ON referral_rewards(status);

-- Trigger for updated_at on referrals
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referrals_updated_at();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    chars VARCHAR(62) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code VARCHAR(20);
    exists BOOLEAN;
BEGIN
    LOOP
        code := '';
        FOR i IN 1..8 LOOP
            code := code || SUBSTRING(chars, FLOOR(RANDOM() * 62) + 1, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = code) INTO exists;
        
        IF NOT exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can only access their own referral data
CREATE POLICY "Users can view own referrals"
    ON referrals FOR SELECT
    USING (auth.uid()::text = referrer_id::text OR auth.uid()::text = referred_user_id::text);

CREATE POLICY "Users can insert own referrals"
    ON referrals FOR INSERT
    WITH CHECK (auth.uid()::text = referrer_id::text);

CREATE POLICY "Users can view own rewards"
    ON referral_rewards FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Admin can access all referral data
CREATE POLICY "Admin can view all referrals"
    ON referrals FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::text 
        AND user_type = 'admin'
    ));

CREATE POLICY "Admin can view all rewards"
    ON referral_rewards FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::text 
        AND user_type = 'admin'
    ));

-- Function to get referral stats
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE (
    total_referrals BIGINT,
    completed_referrals BIGINT,
    total_points_earned BIGINT,
    pending_referrals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT r.id) as total_referrals,
        COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_referrals,
        COALESCE(SUM(r.reward_points), 0) as total_points_earned,
        COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) as pending_referrals
    FROM referrals r
    WHERE r.referrer_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Comment on tables
COMMENT ON TABLE referrals IS 'Stores referral tracking information';
COMMENT ON TABLE referral_rewards IS 'Stores referral rewards and claims';
