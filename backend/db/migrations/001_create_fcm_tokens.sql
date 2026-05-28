-- Migration: Create FCM tokens table
-- Description: Stores Firebase Cloud Messaging tokens for push notifications

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  firebase_token TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}',
  subscribed_matches TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_firebase_token ON fcm_tokens(firebase_token);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_subscribed_matches ON fcm_tokens USING GIN(subscribed_matches);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_is_active ON fcm_tokens(is_active);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fcm_tokens_updated_at
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security)
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own tokens
CREATE POLICY "Users can manage their own FCM tokens"
  ON fcm_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for service role to manage all tokens
CREATE POLICY "Service role can manage all FCM tokens"
  ON fcm_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE fcm_tokens IS 'Stores Firebase Cloud Messaging tokens for push notifications';
COMMENT ON COLUMN fcm_tokens.user_id IS 'User ID from Supabase auth';
COMMENT ON COLUMN fcm_tokens.firebase_token IS 'Firebase FCM registration token';
COMMENT ON COLUMN fcm_tokens.device_info IS 'Device information (platform, app version, etc.)';
COMMENT ON COLUMN fcm_tokens.subscribed_matches IS 'Array of match IDs the user is subscribed to';
