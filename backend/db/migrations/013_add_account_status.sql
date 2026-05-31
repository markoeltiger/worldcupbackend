-- Migration 013: Add Account Status
-- =================================
-- Extends users table with account status fields

-- Add account status columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS account_suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS account_suspended_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_flagged_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_account_suspended_at ON users(account_suspended_at);
CREATE INDEX IF NOT EXISTS idx_users_account_flagged_at ON users(account_flagged_at);

-- Add comments
COMMENT ON COLUMN users.account_status IS 'Account status: active, suspended, flagged, deleted';
COMMENT ON COLUMN users.account_suspended_at IS 'Timestamp when account was suspended';
COMMENT ON COLUMN users.account_suspended_reason IS 'Reason for account suspension';
COMMENT ON COLUMN users.account_suspended_until IS 'Timestamp when suspension ends (if temporary)';
COMMENT ON COLUMN users.account_flagged_at IS 'Timestamp when account was flagged for review';
COMMENT ON COLUMN users.account_flagged_reason IS 'Reason for account flag';
