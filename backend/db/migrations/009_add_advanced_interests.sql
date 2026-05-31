-- Migration 009: Add Advanced User Interests
-- =========================================
-- Extends users table with advanced personalization fields

-- Add advanced interests columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS favorite_competitions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS favorite_players TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS favorite_clubs TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_favorite_competitions ON users USING GIN(favorite_competitions);
CREATE INDEX IF NOT EXISTS idx_users_favorite_players ON users USING GIN(favorite_players);
CREATE INDEX IF NOT EXISTS idx_users_favorite_clubs ON users USING GIN(favorite_clubs);
CREATE INDEX IF NOT EXISTS idx_users_interests ON users USING GIN(interests);

-- Add comments
COMMENT ON COLUMN users.favorite_competitions IS 'User favorite competitions (e.g., world_cup, champions_league)';
COMMENT ON COLUMN users.favorite_players IS 'User favorite players';
COMMENT ON COLUMN users.favorite_clubs IS 'User favorite clubs/teams';
COMMENT ON COLUMN users.interests IS 'User interests (e.g., predictions, transfers, live_scores)';
