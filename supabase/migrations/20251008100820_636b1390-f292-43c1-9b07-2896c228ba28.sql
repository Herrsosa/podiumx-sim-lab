-- Drop the restrictive INSERT policy on conversation_participants
DROP POLICY IF EXISTS "authenticated_users_can_insert_participants" ON public.conversation_participants;

-- Allow INSERT if user is the conversation creator OR inserting themselves
CREATE POLICY "authenticated_users_can_insert_participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_participants.conversation_id
    AND conversations.creator_id = auth.uid()
  )
);