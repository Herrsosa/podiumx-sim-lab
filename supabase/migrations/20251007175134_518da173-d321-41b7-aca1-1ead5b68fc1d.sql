-- First, let's see what's currently blocking by dropping ALL policies and recreating cleanly
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can create conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can create participants" ON public.conversation_participants;

-- Create simple, working policies for conversations
CREATE POLICY "allow_authenticated_insert_conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_select_own_conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Create simple, working policies for conversation_participants
CREATE POLICY "allow_authenticated_insert_participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_select_own_participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "allow_update_own_participants"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);