-- Add tour completion tracking to profiles
-- Allows version-aware tracking so we can re-run tour when content changes

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tour_version_completed text DEFAULT NULL;

-- NULL = never completed tour
-- 'v1' = completed version 1 of the tour
-- Future versions can check if user needs to see updated tour
