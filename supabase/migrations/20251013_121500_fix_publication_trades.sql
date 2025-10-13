-- Make publication creation and membership idempotent

-- Ensure publication exists (no-op if it already does)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END$$;

-- Add public.trades to publication only if it isn't already included
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trades'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.trades';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Safe to ignore if something raced or it was already there
    NULL;
END$$;
