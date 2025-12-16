-- Add is_pinned column to posts table for pinned workouts feature
-- Athletes can pin up to 3 workouts to show at top of their profile

ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Index for efficient querying of pinned posts
CREATE INDEX IF NOT EXISTS idx_posts_author_pinned ON posts(author_id, is_pinned) WHERE is_pinned = TRUE;

-- Comment for clarity
COMMENT ON COLUMN posts.is_pinned IS 'Whether this post is pinned to the top of the athlete profile';
