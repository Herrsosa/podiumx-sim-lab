-- Create storage bucket for workout media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('workout-media', 'workout-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for workout media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Users can upload their own workout media'
  ) THEN
    CREATE POLICY "Users can upload their own workout media"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'workout-media'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage'
      AND tablename='objects'
      AND policyname='Workout media is publicly accessible'
  ) THEN
    CREATE POLICY "Workout media is publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'workout-media');
  END IF;
END$$;