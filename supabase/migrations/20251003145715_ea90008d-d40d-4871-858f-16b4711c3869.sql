DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_tokens') THEN
    ALTER TABLE public.athlete_tokens
    DROP CONSTRAINT IF EXISTS athlete_tokens_athlete_id_profiles_id_fk;

    ALTER TABLE public.athlete_tokens
    ADD CONSTRAINT athlete_tokens_athlete_id_profiles_id_fk
    FOREIGN KEY (athlete_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;
