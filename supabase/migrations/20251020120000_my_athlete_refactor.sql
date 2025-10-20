-- Refactor My Athlete experience: gated workouts, locker chat, and DMs

-- Mirror holdings table with a balance-centric view for gating checks
CREATE OR REPLACE VIEW public.user_token_holdings AS
SELECT
  h.user_id,
  h.athlete_id,
  GREATEST(COALESCE(h.qty, 0), 0)::int AS balance
FROM public.holdings h;

COMMENT ON VIEW public.user_token_holdings IS
  'Convenience view exposing token balances for access control across workouts, chat, and DMs.';

-- Ensure workouts (posts) carry visibility metadata
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'supporters', 'backers')),
  ADD COLUMN IF NOT EXISTS min_tokens_required INTEGER NOT NULL DEFAULT 0;

-- Backfill sensible defaults for legacy rows
UPDATE public.posts
SET min_tokens_required = 1
WHERE visibility = 'supporters' AND min_tokens_required = 0;

UPDATE public.posts
SET min_tokens_required = 10
WHERE visibility = 'backers' AND min_tokens_required < 10;

-- Replace older policies with tier-aware access rules
DROP POLICY IF EXISTS posts_select_visibility ON public.posts;
DROP POLICY IF EXISTS workouts_read ON public.posts;
CREATE POLICY workouts_read ON public.posts
FOR SELECT USING (
  author_id = auth.uid()
  OR visibility = 'public'
  OR EXISTS (
    SELECT 1
    FROM public.user_token_holdings h
    WHERE h.user_id = auth.uid()
      AND h.athlete_id = public.posts.author_id
      AND h.balance >= GREATEST(1, public.posts.min_tokens_required)
  )
);

DROP POLICY IF EXISTS workouts_write ON public.posts;
CREATE POLICY workouts_write ON public.posts
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Rename and harden locker chat storage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'athlete_chat_messages'
  ) THEN
    ALTER TABLE public.chat_messages RENAME TO athlete_chat_messages;
  END IF;
END $$;

ALTER TABLE public.athlete_chat_messages
  RENAME COLUMN user_id TO sender_id;

ALTER TABLE public.athlete_chat_messages
  ALTER COLUMN sender_id SET DEFAULT auth.uid();

ALTER TABLE public.athlete_chat_messages
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.athlete_chat_messages
  ALTER COLUMN content SET NOT NULL;

ALTER TABLE public.athlete_chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

ALTER TABLE public.athlete_chat_messages
  ADD CONSTRAINT athlete_chat_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.athlete_chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_athlete_id_fkey;

ALTER TABLE public.athlete_chat_messages
  ADD CONSTRAINT athlete_chat_messages_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_chat_messages_athlete_id;
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_athlete_created;
DROP INDEX IF EXISTS idx_chat_athlete_created;

CREATE INDEX IF NOT EXISTS idx_athlete_chat_athlete_created
  ON public.athlete_chat_messages (athlete_id, created_at DESC);

-- Refresh RLS policies for locker chat
DROP POLICY IF EXISTS chat_messages_select_all ON public.athlete_chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_authenticated ON public.athlete_chat_messages;
DROP POLICY IF EXISTS chat_select_token_holders ON public.athlete_chat_messages;
DROP POLICY IF EXISTS chat_insert_token_holders ON public.athlete_chat_messages;
DROP POLICY IF EXISTS chat_read ON public.athlete_chat_messages;
DROP POLICY IF EXISTS chat_write ON public.athlete_chat_messages;

CREATE POLICY chat_read ON public.athlete_chat_messages
FOR SELECT USING (
  sender_id = auth.uid()
  OR athlete_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.user_token_holdings h
    WHERE h.user_id = auth.uid()
      AND h.athlete_id = public.athlete_chat_messages.athlete_id
      AND h.balance >= 1
  )
);

CREATE POLICY chat_write ON public.athlete_chat_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_token_holdings h
      WHERE h.user_id = auth.uid()
        AND h.athlete_id = public.athlete_chat_messages.athlete_id
        AND h.balance >= 1
    )
  )
);

ALTER TABLE public.athlete_chat_messages
  ENABLE ROW LEVEL SECURITY;

-- Reset DM schema to dm_* naming with strict RLS
DROP TRIGGER IF EXISTS update_conversation_timestamp_on_new_message ON public.dm_messages;
DROP FUNCTION IF EXISTS public.update_conversation_timestamp();
DROP FUNCTION IF EXISTS public.start_or_get_dm(UUID);
DROP FUNCTION IF EXISTS public.get_dm_conversations(UUID, integer, integer);
DROP FUNCTION IF EXISTS public.is_conversation_member(UUID);

DROP TABLE IF EXISTS public.dm_messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.dm_participants (
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY conv_read ON public.dm_conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.dm_participants p
    WHERE p.conversation_id = public.dm_conversations.id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY part_read ON public.dm_participants
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY msg_read ON public.dm_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.dm_participants p
    WHERE p.conversation_id = public.dm_messages.conversation_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY msg_insert ON public.dm_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.dm_participants p
    WHERE p.conversation_id = public.dm_messages.conversation_id
      AND p.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conv_created
  ON public.dm_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_participants_user
  ON public.dm_participants (user_id);

-- DM RPC helpers (security definer)
CREATE OR REPLACE FUNCTION public.start_dm(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv UUID;
BEGIN
  IF p_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Other user id required';
  END IF;

  SELECT c.id
  INTO v_conv
  FROM public.dm_conversations c
  JOIN public.dm_participants a
    ON a.conversation_id = c.id
   AND a.user_id = auth.uid()
  JOIN public.dm_participants b
    ON b.conversation_id = c.id
   AND b.user_id = p_other_user_id
  LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.dm_conversations DEFAULT VALUES
    RETURNING id INTO v_conv;

    INSERT INTO public.dm_participants (conversation_id, user_id, last_read_at)
    VALUES
      (v_conv, auth.uid(), now()),
      (v_conv, p_other_user_id, NULL);
  END IF;

  RETURN v_conv;
END $$;

CREATE OR REPLACE FUNCTION public.get_dm_conversations()
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_username TEXT,
  other_avatar_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mine AS (
    SELECT conversation_id, last_read_at
    FROM public.dm_participants
    WHERE user_id = auth.uid()
  ),
  other_participants AS (
    SELECT dp.conversation_id,
           dp.user_id AS other_user_id
    FROM public.dm_participants dp
    JOIN mine m ON m.conversation_id = dp.conversation_id
    WHERE dp.user_id <> auth.uid()
  ),
  latest AS (
    SELECT dm.conversation_id,
           dm.body,
           dm.created_at,
           ROW_NUMBER() OVER (PARTITION BY dm.conversation_id ORDER BY dm.created_at DESC) AS rn
    FROM public.dm_messages dm
  ),
  unread AS (
    SELECT dp.conversation_id,
           COUNT(*)::int AS unread_count
    FROM public.dm_participants dp
    JOIN public.dm_messages dm
      ON dm.conversation_id = dp.conversation_id
    WHERE dp.user_id = auth.uid()
      AND dm.sender_id <> auth.uid()
      AND (dp.last_read_at IS NULL OR dm.created_at > dp.last_read_at)
    GROUP BY dp.conversation_id
  )
  SELECT
    o.conversation_id,
    o.other_user_id,
    COALESCE(pr.display_name, pr.username) AS other_username,
    pr.avatar_url AS other_avatar_url,
    l.body AS last_message,
    l.created_at AS last_message_at,
    COALESCE(u.unread_count, 0) AS unread_count
  FROM other_participants o
  LEFT JOIN mine m ON m.conversation_id = o.conversation_id
  LEFT JOIN latest l ON l.conversation_id = o.conversation_id AND l.rn = 1
  LEFT JOIN unread u ON u.conversation_id = o.conversation_id
  LEFT JOIN public.profiles pr ON pr.id = o.other_user_id
  ORDER BY COALESCE(l.created_at, 'epoch'::timestamptz) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_dm_messages(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  body TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dm.id,
         dm.sender_id,
         dm.body,
         dm.media_url,
         dm.created_at
  FROM public.dm_messages dm
  WHERE dm.conversation_id = p_conversation_id
    AND EXISTS (
      SELECT 1
      FROM public.dm_participants p
      WHERE p.conversation_id = p_conversation_id
        AND p.user_id = auth.uid()
    )
  ORDER BY dm.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.send_dm(
  p_conversation_id UUID,
  p_body TEXT,
  p_media_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  IF p_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Conversation id required';
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Message body required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.dm_participants p
    WHERE p.conversation_id = p_conversation_id
      AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  INSERT INTO public.dm_messages (conversation_id, sender_id, body, media_url)
  VALUES (p_conversation_id, auth.uid(), p_body, p_media_url)
  RETURNING id INTO v_message_id;

  UPDATE public.dm_conversations
  SET updated_at = now()
  WHERE id = p_conversation_id;

  UPDATE public.dm_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();

  RETURN v_message_id;
END $$;

GRANT EXECUTE ON FUNCTION public.start_dm(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dm_conversations() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dm_messages(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_dm(UUID, TEXT, TEXT) TO anon, authenticated;
