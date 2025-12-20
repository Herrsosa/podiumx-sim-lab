-- Add missing provider column to oauth_states table
-- This column is required by both the frontend (stravaAuth.ts) and the Edge Function (strava-oauth-exchange)

-- Add the provider column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'oauth_states' 
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.oauth_states 
    ADD COLUMN provider TEXT NOT NULL DEFAULT 'strava';
  END IF;
END $$;

-- Create index for faster lookups by provider
CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON public.oauth_states(provider);

-- Add policy to allow service role full access (needed for Edge Functions)
-- Drop existing policy if it exists and recreate with proper permissions
DROP POLICY IF EXISTS "Service role has full access to oauth_states" ON public.oauth_states;

CREATE POLICY "Service role has full access to oauth_states"
ON public.oauth_states
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON COLUMN public.oauth_states.provider IS 'OAuth provider name (e.g., strava)';
