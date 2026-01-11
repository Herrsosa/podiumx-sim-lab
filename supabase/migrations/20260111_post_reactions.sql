-- Migration: Add post_reactions table for emoji reactions
-- Supports 🔥 💪 👏 reactions on workout posts

CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '👏')),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only react once per emoji per post
  UNIQUE(post_id, user_id, emoji)
);

-- Indexes for efficient queries
CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON post_reactions(user_id);

-- Enable Row Level Security
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
  ON post_reactions FOR SELECT
  USING (true);

-- Authenticated users can add their own reactions
CREATE POLICY "Users can add their own reactions"
  ON post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON post_reactions TO authenticated, anon;
GRANT INSERT, DELETE ON post_reactions TO authenticated;
