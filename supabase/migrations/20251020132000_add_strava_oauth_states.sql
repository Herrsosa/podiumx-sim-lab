-- Create temporary OAuth state storage to correlate Strava redirects with logged-in users
CREATE TABLE IF NOT EXISTS public.oauth_states (
  state UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own OAuth states"
ON public.oauth_states
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_states_created_at ON public.oauth_states(created_at DESC);

COMMENT ON TABLE public.oauth_states IS 'Temporary OAuth state values to complete Strava handshakes';

-- Down migration (manual):
-- DROP TABLE IF EXISTS public.oauth_states;
