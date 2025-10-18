-- Optimize high-traffic read paths with composite indexes

CREATE INDEX IF NOT EXISTS idx_trades_athlete_created_desc
ON public.trades (athlete_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_author_created_desc
ON public.posts (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_athlete_created
ON public.chat_messages (athlete_id, created_at);

CREATE INDEX IF NOT EXISTS idx_holdings_user_athlete
ON public.holdings (user_id, athlete_id);
