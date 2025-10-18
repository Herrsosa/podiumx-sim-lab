-- Optimize DM lookups and add centralized conversation summary RPC

-- Replace older indexes with composite versions that support the RPC plan
DROP INDEX IF EXISTS public.idx_dm_messages_conversation_id;
DROP INDEX IF EXISTS public.idx_dm_messages_created_at;
CREATE INDEX IF NOT EXISTS idx_dm_messages_convo_created_desc
  ON public.dm_messages (conversation_id, created_at DESC);

DROP INDEX IF EXISTS public.idx_conversation_participants_user_id;
DROP INDEX IF EXISTS public.idx_conversation_participants_conversation_id;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_convo
  ON public.conversation_participants (user_id, conversation_id);

-- Aggregate DM conversations (paginated, newest first)
CREATE OR REPLACE FUNCTION public.get_dm_conversations(
  p_user uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  conversation_id uuid,
  updated_at timestamptz,
  other_user_id uuid,
  other_display_name text,
  other_avatar_url text,
  unread_count integer,
  last_message text,
  last_message_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT cp.conversation_id,
           cp.last_read_at
    FROM public.conversation_participants cp
    WHERE cp.user_id = p_user
  ),
  counterparts AS (
    SELECT cp.conversation_id,
           cp.user_id,
           pr.display_name,
           pr.avatar_url
    FROM public.conversation_participants cp
    JOIN base b ON b.conversation_id = cp.conversation_id
    LEFT JOIN public.profiles pr ON pr.id = cp.user_id
    WHERE cp.user_id <> p_user
  ),
  latest AS (
    SELECT dm.conversation_id,
           MAX(dm.created_at) AS last_message_at,
           (ARRAY_AGG(dm.content ORDER BY dm.created_at DESC))[1] AS last_message
    FROM public.dm_messages dm
    JOIN base b ON b.conversation_id = dm.conversation_id
    GROUP BY dm.conversation_id
  ),
  unread AS (
    SELECT dm.conversation_id,
           COUNT(*) AS unread_count
    FROM public.dm_messages dm
    JOIN base b ON b.conversation_id = dm.conversation_id
    WHERE b.last_read_at IS NULL OR dm.created_at > b.last_read_at
    GROUP BY dm.conversation_id
  )
  SELECT
    c.id AS conversation_id,
    COALESCE(l.last_message_at, c.updated_at) AS updated_at,
    co.user_id AS other_user_id,
    co.display_name AS other_display_name,
    co.avatar_url AS other_avatar_url,
    COALESCE(u.unread_count, 0) AS unread_count,
    l.last_message,
    l.last_message_at
  FROM public.conversations c
  JOIN base b ON b.conversation_id = c.id
  LEFT JOIN counterparts co ON co.conversation_id = c.id
  LEFT JOIN latest l ON l.conversation_id = c.id
  LEFT JOIN unread u ON u.conversation_id = c.id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 20), 0)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

