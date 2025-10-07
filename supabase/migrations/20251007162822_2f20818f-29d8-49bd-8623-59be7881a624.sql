-- Allow users to create conversations
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update conversation participants policies to allow inserts for both parties
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;

CREATE POLICY "Users can create conversation participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);