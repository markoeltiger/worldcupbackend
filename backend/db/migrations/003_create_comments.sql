-- Migration: Create comments table
-- Description: Stores user comments for live matches

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  comment_text TEXT NOT NULL,
  heart_count INTEGER DEFAULT 0,
  respect_count INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_match_id ON comments(match_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own comments
CREATE POLICY "Users can manage their own comments"
  ON comments
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for service role to manage all comments
CREATE POLICY "Service role can manage all comments"
  ON comments
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create policy for public read access to comments
CREATE POLICY "Public can read comments"
  ON comments
  FOR SELECT
  USING (true);

-- Add comment
COMMENT ON TABLE comments IS 'Stores user comments for live matches';
COMMENT ON COLUMN comments.match_id IS 'External match ID from API-Football';
COMMENT ON COLUMN comments.badges IS 'User badges based on account tiers and leaderboard ranks';
