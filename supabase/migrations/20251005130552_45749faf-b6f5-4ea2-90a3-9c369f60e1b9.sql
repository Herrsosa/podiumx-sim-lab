-- Create storage bucket for workout media
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-media', 'workout-media', true)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for workout media
CREATE POLICY "Anyone can view workout media"
ON storage.objects FOR SELECT
USING (bucket_id = 'workout-media');

CREATE POLICY "Authenticated users can upload workout media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workout-media' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own workout media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'workout-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own workout media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workout-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'posts' AND column_name = 'token_gated'
    ) THEN
      ALTER TABLE public.posts ADD COLUMN token_gated BOOLEAN DEFAULT FALSE;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'posts' AND column_name = 'strava_activity_id'
    ) THEN
      ALTER TABLE public.posts ADD COLUMN strava_activity_id BIGINT;
    END IF;
  END IF;
END $$;

-- Create table for storing athlete integrations
CREATE TABLE IF NOT EXISTS athlete_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('strava', 'garmin', 'instagram')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, service)
);

ALTER TABLE athlete_integrations ENABLE ROW LEVEL SECURITY;

-- Only athletes can view and manage their own integrations
CREATE POLICY "Athletes can view their own integrations"
ON athlete_integrations FOR SELECT
USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert their own integrations"
ON athlete_integrations FOR INSERT
WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update their own integrations"
ON athlete_integrations FOR UPDATE
USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can delete their own integrations"
ON athlete_integrations FOR DELETE
USING (auth.uid() = athlete_id);
