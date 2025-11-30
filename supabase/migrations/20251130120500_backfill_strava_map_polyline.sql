-- Backfill strava_map_polyline from activities table
UPDATE public.posts
SET strava_map_polyline = (
  SELECT COALESCE(raw->'map'->>'summary_polyline', raw->'map'->>'polyline')
  FROM public.activities
  WHERE public.activities.imported_post_id = public.posts.id
)
WHERE strava_map_polyline IS NULL;
