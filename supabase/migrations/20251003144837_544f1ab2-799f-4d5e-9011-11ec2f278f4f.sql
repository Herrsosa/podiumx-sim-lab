DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_tokens') THEN
    CREATE POLICY "athlete_tokens_insert_self"
    ON public.athlete_tokens
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = athlete_id);
  END IF;
END $$;
