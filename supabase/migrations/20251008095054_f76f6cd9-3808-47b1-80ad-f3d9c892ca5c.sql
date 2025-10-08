-- Fix RLS policies for DM conversations
-- The issue is that the policy needs to be more permissive for creating conversations

DROP POLICY IF EXISTS "allow_authenticated_insert_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_authenticated_insert_participants" ON public.conversation_participants;

-- Allow any authenticated user to create a conversation
CREATE POLICY "allow_authenticated_insert_conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow any authenticated user to add participants (they can only add themselves via other checks)
CREATE POLICY "allow_authenticated_insert_participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);