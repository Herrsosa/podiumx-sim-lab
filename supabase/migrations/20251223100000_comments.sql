-- ============================================
-- Comments System for Proof-of-Sweat Posts
-- ============================================

-- Drop and recreate comments table with correct FK (profiles, not auth.users)
DROP TABLE IF EXISTS comments CASCADE;

-- Comments table: stores comments on posts
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) <= 500 AND char_length(text) >= 1)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

-- Cached comments count on posts for performance
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Comments are publicly readable" ON comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

-- Comments RLS: anyone can read, only author can insert/update/delete
CREATE POLICY "Comments are publicly readable" ON comments 
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own comments" ON comments 
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own comments" ON comments 
  FOR UPDATE USING (author_id = auth.uid()) 
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON comments 
  FOR DELETE USING (author_id = auth.uid());

-- ============================================
-- Trigger Functions
-- ============================================

-- Trigger: update comments_count on posts
CREATE OR REPLACE FUNCTION update_comments_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_comments_count ON comments;
CREATE TRIGGER trg_update_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- Trigger: update updated_at on comment edit
CREATE OR REPLACE FUNCTION update_comment_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_comment_updated_at ON comments;
CREATE TRIGGER trg_update_comment_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_updated_at();

-- Trigger: notify on comment received
CREATE OR REPLACE FUNCTION notify_comment_received() RETURNS TRIGGER AS $$
DECLARE
  post_owner_id uuid;
BEGIN
  SELECT author_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  -- Don't notify if user comments on their own post
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.author_id THEN
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
      post_owner_id,
      'comment_received',
      jsonb_build_object(
        'actor_id', NEW.author_id,
        'post_id', NEW.post_id,
        'comment_id', NEW.id,
        'preview', left(NEW.text, 100)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_comment_received ON comments;
CREATE TRIGGER trg_notify_comment_received
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_comment_received();

-- ============================================
-- Grants
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
