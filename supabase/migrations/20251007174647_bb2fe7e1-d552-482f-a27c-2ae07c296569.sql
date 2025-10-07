-- Fix conversations RLS by ensuring the role check works correctly
-- First, let's check if there are any other policies blocking
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a more explicit policy
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Also recreate the participants policy to be more explicit
DROP POLICY IF EXISTS "Users can create conversation participants" ON public.conversation_participants;

CREATE POLICY "Authenticated users can create participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Ensure athletes can see their own community chat messages
DROP POLICY IF EXISTS "chat_select_token_holders" ON public.chat_messages;

CREATE POLICY "Token holders and athletes can read chat"
ON public.chat_messages
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM holdings 
    WHERE holdings.user_id = auth.uid() 
    AND holdings.athlete_id = chat_messages.athlete_id 
    AND holdings.qty > 0
  ))
  OR 
  (athlete_id = auth.uid())
);