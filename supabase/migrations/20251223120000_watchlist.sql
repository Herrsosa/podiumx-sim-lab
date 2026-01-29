-- Watchlist feature: Allow users to track athletes without buying tokens
-- Migration: 20251223_watchlist.sql

-- Create watchlist table
CREATE TABLE IF NOT EXISTS public.watchlist (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, athlete_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist (user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_athlete_id ON public.watchlist (athlete_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_created ON public.watchlist (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and modify their own watchlist
CREATE POLICY "Users can view their own watchlist"
  ON public.watchlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own watchlist"
  ON public.watchlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own watchlist"
  ON public.watchlist
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
