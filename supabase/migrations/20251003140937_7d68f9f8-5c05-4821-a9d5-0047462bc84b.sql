-- Fix wallets INSERT policy to include WITH CHECK clause (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wallets') THEN
    DROP POLICY IF EXISTS "wallets_insert_own" ON public.wallets;

    CREATE POLICY "wallets_insert_own"
    ON public.wallets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
