-- Create enum if missing (Postgres has no IF NOT EXISTS for enums)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_side') THEN
    CREATE TYPE trade_side AS ENUM ('BUY', 'SELL');
  END IF;
END
$$;
