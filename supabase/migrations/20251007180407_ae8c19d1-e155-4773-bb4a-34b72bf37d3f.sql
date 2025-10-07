-- Fix RLS policy for conversations to properly allow authenticated users to create conversations
-- Drop and recreate with explicit auth check
DROP POLICY IF EXISTS "allow_authenticated_insert_conversations" ON public.conversations;

CREATE POLICY "allow_authenticated_insert_conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the conversation_participants policy is correct
DROP POLICY IF EXISTS "allow_authenticated_insert_participants" ON public.conversation_participants;

CREATE POLICY "allow_authenticated_insert_participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);