-- Ensure specific demo agents use the default pixel-avatar fallback (no stored avatar_url).
-- This prevents them from inheriting a seeded human avatar (e.g. Zara) via scripts/simulation sync.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    UPDATE public.profiles
    SET avatar_url = NULL,
        updated_at = now()
    WHERE lower(username) IN (
      'ares-demo',
      'ares_demo',
      'ares-demo_267',
      'verify_agent',
      'verify-agent',
      'verify_agent_unique_v1'
    );
  END IF;
END $$;

