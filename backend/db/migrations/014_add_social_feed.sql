-- Migration 014: Add Social Feed
-- ================================
-- Creates table for social feed with predictions and community activity

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Social feed table
CREATE TABLE IF NOT EXISTS social_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Feed item details
    feed_type VARCHAR(50) NOT NULL, -- prediction, match_comment, achievement, milestone
    content TEXT NOT NULL,
    metadata JSONB,
    
    -- Related entities
    related_match_id UUID,
    related_prediction_id UUID,
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    
    -- Visibility
    is_public BOOLEAN DEFAULT true,
    is_pinned BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed likes table
CREATE TABLE IF NOT EXISTS feed_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID REFERENCES social_feed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_feed_like UNIQUE (feed_id, user_id)
);

-- Feed comments table
CREATE TABLE IF NOT EXISTS feed_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID REFERENCES social_feed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    parent_comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_feed_user_id ON social_feed(user_id);
CREATE INDEX idx_feed_type ON social_feed(feed_type);
CREATE INDEX idx_feed_created_at ON social_feed(created_at DESC);
CREATE INDEX idx_feed_public ON social_feed(is_public);
CREATE INDEX idx_feed_related_match ON social_feed(related_match_id);
CREATE INDEX idx_feed_likes_feed_id ON feed_likes(feed_id);
CREATE INDEX idx_feed_likes_user_id ON feed_likes(user_id);
CREATE INDEX idx_feed_comments_feed_id ON feed_comments(feed_id);
CREATE INDEX idx_feed_comments_user_id ON feed_comments(user_id);
CREATE INDEX idx_feed_comments_parent ON feed_comments(parent_comment_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_feed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feed_updated_at
    BEFORE UPDATE ON social_feed
    FOR EACH ROW
    EXECUTE FUNCTION update_feed_updated_at();

CREATE TRIGGER trigger_comments_updated_at
    BEFORE UPDATE ON feed_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_feed_updated_at();

-- Row Level Security (RLS)
ALTER TABLE social_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

-- Users can view public feed items and their own
CREATE POLICY "Users can view public feed"
    ON social_feed FOR SELECT
    USING (is_public = true OR auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own feed"
    ON social_feed FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own feed"
    ON social_feed FOR UPDATE
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own feed"
    ON social_feed FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Feed likes policies
CREATE POLICY "Users can view feed likes"
    ON feed_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own likes"
    ON feed_likes FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own likes"
    ON feed_likes FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Feed comments policies
CREATE POLICY "Users can view feed comments"
    ON feed_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own comments"
    ON feed_comments FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own comments"
    ON feed_comments FOR UPDATE
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own comments"
    ON feed_comments FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Comment on tables
COMMENT ON TABLE social_feed IS 'Stores social feed items including predictions and community activity';
COMMENT ON TABLE feed_likes IS 'Stores likes on feed items';
COMMENT ON TABLE feed_comments IS 'Stores comments on feed items';
