-- Add agent support to profiles

-- 1. Create athlete_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'athlete_type') THEN
    CREATE TYPE athlete_type AS ENUM ('human', 'agent');
  END IF;
END $$;

-- 2. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS type athlete_type DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS api_key UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS monad_wallet_address TEXT;

-- 3. Update existing profiles to be 'human' (though default covers it)
UPDATE public.profiles SET type = 'human' WHERE type IS NULL;

-- 4. Create an index for api_key lookups
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON public.profiles(api_key);
