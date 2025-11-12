-- Add index on athlete_tokens.athlete_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_athlete_tokens_athlete_id ON public.athlete_tokens(athlete_id);

-- Create RPC function to batch fetch athlete data
CREATE OR REPLACE FUNCTION public.get_athletes_batch(_ids uuid[])
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  sport text,
  avatar_url text,
  bio text,
  instagram_url text,
  strava_url text,
  created_at timestamptz,
  supply int,
  a numeric,
  b numeric,
  c numeric,
  treasury_balance numeric,
  athlete_earnings numeric
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.sport,
    p.avatar_url,
    p.bio,
    p.instagram_url,
    p.strava_url,
    p.created_at,
    COALESCE(t.supply, 0) as supply,
    COALESCE(t.a, 0.0002) as a,
    COALESCE(t.b, 0.02) as b,
    COALESCE(t.c, 1) as c,
    COALESCE(t.treasury_balance, 0) as treasury_balance,
    COALESCE(t.athlete_earnings, 0) as athlete_earnings
  FROM public.profiles p
  LEFT JOIN public.athlete_tokens t ON t.athlete_id = p.id
  WHERE p.id = ANY(_ids)
$$;