-- Add column to track last synced activity timestamp for incremental imports
ALTER TABLE public.oauth_connections
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Add index to activities table for faster upsert conflict resolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_user_external
ON public.activities(user_id, external_id)
WHERE external_id IS NOT NULL;

-- Comment explaining the column
COMMENT ON COLUMN public.oauth_connections.last_activity_at IS 
  'Timestamp of the most recent activity start_time from Strava. Used for incremental sync.';
