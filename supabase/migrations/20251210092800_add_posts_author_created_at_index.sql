-- Add composite index on posts (author_id, created_at) for faster athlete-specific feed queries
-- This optimizes the WHERE author_id = X ORDER BY created_at DESC pattern used in feed hooks

CREATE INDEX IF NOT EXISTS idx_posts_author_created_at_desc
ON public.posts (author_id, created_at DESC);
