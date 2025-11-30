-- Add strava_map_polyline column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS strava_map_polyline text;
