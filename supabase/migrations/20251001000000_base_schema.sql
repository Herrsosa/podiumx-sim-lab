-- Base schema to ensure core tables exist before later migrations run

-- Trade side enum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_side') THEN
    CREATE TYPE trade_side AS ENUM ('BUY', 'SELL');
  END IF;
END $$;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT DEFAULT '',
  sport TEXT,
  avatar_url TEXT,
  strava_url TEXT,
  instagram_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Athlete tokens
CREATE TABLE IF NOT EXISTS public.athlete_tokens (
  athlete_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT UNIQUE NOT NULL,
  supply INTEGER DEFAULT 0,
  a NUMERIC DEFAULT 0.0002,
  b NUMERIC DEFAULT 0.02,
  c NUMERIC DEFAULT 1,
  treasury_balance NUMERIC DEFAULT 0,
  athlete_earnings NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Holdings table
CREATE TABLE IF NOT EXISTS public.holdings (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athlete_tokens(athlete_id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  avg_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, athlete_id)
);

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT,
  workout_json JSONB,
  token_gated BOOLEAN DEFAULT FALSE,
  strava_activity_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athlete_tokens(athlete_id) ON DELETE CASCADE,
  side trade_side NOT NULL,
  qty INTEGER NOT NULL,
  gross_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL,
  price_after NUMERIC NOT NULL,
  supply_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_athlete_created ON public.trades (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_holdings_user_athlete_base ON public.holdings (user_id, athlete_id);
