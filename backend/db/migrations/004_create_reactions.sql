-- Migration: Create reactions table
-- Description: Stores user reactions to comments

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_match_id ON reactions(match_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_user ON reactions(comment_id, user_id);

-- Add unique constraint to prevent duplicate reactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique ON reactions(comment_id, user_id, emoji);

-- Add RLS (Row Level Security)
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own reactions
CREATE POLICY "Users can manage their own reactions"
  ON reactions
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for service role to manage all reactions
CREATE POLICY "Service role can manage all reactions"
  ON reactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE reactions IS 'Stores user reactions to comments';
COMMENT ON COLUMN reactions.emoji IS 'Emoji reaction (e.g., 👏, ❤️, 🔥)';
