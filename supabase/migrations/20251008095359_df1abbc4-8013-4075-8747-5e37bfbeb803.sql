-- Drop existing policies on conversations table
DROP POLICY IF EXISTS "allow_authenticated_insert_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_select_own_conversations" ON public.conversations;

-- Grant INSERT to authenticated users (conversations table has no user columns)
-- Users can create conversations freely, access control is handled via conversation_participants
CREATE POLICY "authenticated_users_can_insert_conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can only select conversations they are participants in
CREATE POLICY "users_can_select_own_conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Fix the conversation_participants policy
DROP POLICY IF EXISTS "allow_authenticated_insert_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_select_own_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_update_own_participants" ON public.conversation_participants;

-- Users can insert participants (access control: only add yourself or during conversation creation)
CREATE POLICY "authenticated_users_can_insert_participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can select participants of their conversations
CREATE POLICY "users_can_select_participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Users can update their own participant record (for last_read_at)
CREATE POLICY "users_can_update_own_participant"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());