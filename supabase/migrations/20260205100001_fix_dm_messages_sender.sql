-- Update get_dm_messages to include sender profile info
-- Drop existing function first (returns different columns)
DROP FUNCTION IF EXISTS public.get_dm_messages(UUID);

CREATE FUNCTION public.get_dm_messages(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  body TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ,
  sender_username TEXT,
  sender_display_name TEXT,
  sender_avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dm.id,
         dm.sender_id,
         dm.body,
         dm.media_url,
         dm.created_at,
         p.username AS sender_username,
         p.display_name AS sender_display_name,
         p.avatar_url AS sender_avatar_url
  FROM public.dm_messages dm
  LEFT JOIN public.profiles p ON p.id = dm.sender_id
  WHERE dm.conversation_id = p_conversation_id
    AND EXISTS (
      SELECT 1
      FROM public.dm_participants dp
      WHERE dp.conversation_id = p_conversation_id
        AND dp.user_id = auth.uid()
    )
  ORDER BY dm.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_dm_messages(UUID) TO anon, authenticated;
