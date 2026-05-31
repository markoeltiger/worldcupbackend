-- Migration: Add Users Table
-- Description: Create users table for authentication and profile management
-- Version: 006

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  display_name VARCHAR(255),
  photo_url TEXT,
  country VARCHAR(2),
  favorite_country VARCHAR(2),
  favorite_teams JSONB DEFAULT '[]',
  favorite_leagues JSONB DEFAULT '[]',
  favorite_players JSONB DEFAULT '[]',
  user_type VARCHAR(50) DEFAULT 'user',
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_guest BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  revenuecat_customer_id VARCHAR(255),
  prediction_points INTEGER DEFAULT 0,
  prediction_rank INTEGER,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  public_profile BOOLEAN DEFAULT true,
  username VARCHAR(100) UNIQUE,
  bio TEXT,
  profile_completion_score INTEGER DEFAULT 0,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);
CREATE INDEX IF NOT EXISTS idx_users_prediction_rank ON users(prediction_rank);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Create user_follows table for social features
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Create indexes for user_follows
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Create user_preferences table for notification and app preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  match_notifications BOOLEAN DEFAULT true,
  goal_notifications BOOLEAN DEFAULT true,
  favorite_team_notifications BOOLEAN DEFAULT true,
  world_cup_notifications BOOLEAN DEFAULT true,
  prediction_notifications BOOLEAN DEFAULT true,
  marketing_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  dark_mode BOOLEAN DEFAULT false,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create user_audit_log table for audit logging
CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_audit_log
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_action ON user_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_entity ON user_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at DESC);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update followers/following counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follower_counts_trigger
  AFTER INSERT OR DELETE ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

-- Create trigger to calculate profile completion score
CREATE OR REPLACE FUNCTION calculate_profile_completion_score()
RETURNS TRIGGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Calculate completion score based on filled fields
  IF NEW.email IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.display_name IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.photo_url IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.country IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.favorite_country IS NOT NULL THEN score := score + 5; END IF;
  IF jsonb_array_length(NEW.favorite_teams) > 0 THEN score := score + 15; END IF;
  IF jsonb_array_length(NEW.favorite_leagues) > 0 THEN score := score + 10; END IF;
  IF jsonb_array_length(NEW.favorite_players) > 0 THEN score := score + 10; END IF;
  IF NEW.username IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.bio IS NOT NULL THEN score := score + 10; END IF;
  
  NEW.profile_completion_score := score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_profile_completion_score_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profile_completion_score();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (firebase_uid = current_setting('app.current_firebase_uid', true));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (firebase_uid = current_setting('app.current_firebase_uid', true));

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (firebase_uid = current_setting('app.current_firebase_uid', true));

CREATE POLICY "Public can view public profiles" ON users
  FOR SELECT USING (public_profile = true);

-- RLS Policies for user_follows
CREATE POLICY "Users can view own follows" ON user_follows
  FOR SELECT USING (
    follower_id = (SELECT id FROM users WHERE firebase_uid = current_setting('app.current_firebase_uid', true))
    OR following_id = (SELECT id FROM users WHERE firebase_uid = current_setting('app.current_firebase_uid', true))
  );

CREATE POLICY "Users can insert own follows" ON user_follows
  FOR INSERT WITH CHECK (
    follower_id = (SELECT id FROM users WHERE firebase_uid = current_setting('app.current_firebase_uid', true))
  );

CREATE POLICY "Users can delete own follows" ON user_follows
  FOR DELETE USING (
    follower_id = (SELECT id FROM users WHERE firebase_uid = current_setting('app.current_firebase_uid', true))
  );

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = current_setting('app.current_firebase_uid', true))
  );

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = current_setting('app.current_firebase_uid', true))
  );

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE firebase_uid = current_setting('app.current_firebase_uid', true))
  );

-- RLS Policies for user_audit_log
CREATE POLICY "Users can view own audit logs" ON user_audit_log
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = current_setting('app.current_firebase_uid', true))
  );

CREATE POLICY "Service role can insert audit logs" ON user_audit_log
  FOR INSERT WITH CHECK (true);

-- Add comment to tables
COMMENT ON TABLE users IS 'User profiles and authentication data';
COMMENT ON TABLE user_follows IS 'Social following relationships';
COMMENT ON TABLE user_preferences IS 'User notification and app preferences';
COMMENT ON TABLE user_audit_log IS 'Audit log for user actions';
