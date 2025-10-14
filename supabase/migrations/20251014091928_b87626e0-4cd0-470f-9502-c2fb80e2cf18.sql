-- Create storage bucket for workout media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('workout-media', 'workout-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for workout media
CREATE POLICY "Users can upload their own workout media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'workout-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Workout media is publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'workout-media');