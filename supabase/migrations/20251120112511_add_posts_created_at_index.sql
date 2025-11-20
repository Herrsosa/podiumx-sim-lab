-- Add index on posts.created_at for faster global feed queries
-- This optimizes the ORDER BY created_at DESC operation used in the feed

CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc
ON public.posts (created_at DESC);
