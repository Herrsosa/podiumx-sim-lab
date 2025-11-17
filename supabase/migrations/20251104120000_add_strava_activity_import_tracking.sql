-- Track imported Strava activities so we can avoid duplicates and link to posts
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS imported_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS activities_user_imported_idx
  ON public.activities (user_id, imported_at DESC NULLS LAST);
