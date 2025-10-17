-- Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "posts_select_all" ON public.posts;
DROP POLICY IF EXISTS "chat_messages_select_all" ON public.chat_messages;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
    CREATE POLICY "posts_select_token_gated" ON public.posts
      FOR SELECT
      USING (
        token_gated = false
        OR auth.uid() = author_id
        OR EXISTS (
          SELECT 1 FROM public.holdings
          WHERE user_id = auth.uid()
            AND athlete_id = posts.author_id
            AND qty > 0
        )
      );
  END IF;
END $$;

-- Chat: Token-holder or athlete SELECT policy
-- Allows viewing if:
-- 1. User holds at least 1 token of the athlete
-- 2. User is the athlete themselves
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
    CREATE POLICY "chat_select_token_holders" ON public.chat_messages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.holdings
          WHERE user_id = auth.uid()
            AND athlete_id = chat_messages.athlete_id
            AND qty > 0
        )
        OR chat_messages.athlete_id = auth.uid()
      );
  END IF;
END $$;
