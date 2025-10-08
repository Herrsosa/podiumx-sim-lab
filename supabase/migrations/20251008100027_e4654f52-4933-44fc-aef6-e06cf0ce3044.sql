-- Create security definer function to check conversation membership
-- This breaks the RLS recursion cycle between conversations and conversation_participants
CREATE OR REPLACE FUNCTION public.is_conversation_member(conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = is_conversation_member.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "authenticated_users_can_insert_conversations" ON public.conversations;
DROP POLICY IF EXISTS "users_can_select_own_conversations" ON public.conversations;
DROP POLICY IF EXISTS "authenticated_users_can_insert_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_can_select_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_can_update_own_participant" ON public.conversation_participants;

-- Recreate conversations policies using the helper function
CREATE POLICY "authenticated_users_can_insert_conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "users_can_select_own_conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_member(id));

-- Recreate conversation_participants policies using the helper function
CREATE POLICY "authenticated_users_can_insert_participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_select_participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id));

CREATE POLICY "users_can_update_own_participant"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());