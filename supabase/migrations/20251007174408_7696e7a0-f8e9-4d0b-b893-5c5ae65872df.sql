-- Drop and recreate the conversations INSERT policy to fix RLS issue
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure the conversation_participants policy allows both users
DROP POLICY IF EXISTS "Users can create conversation participants" ON public.conversation_participants;

CREATE POLICY "Users can create conversation participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);