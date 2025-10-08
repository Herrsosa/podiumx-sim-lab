-- Add creator_id column to conversations table
ALTER TABLE public.conversations
ADD COLUMN creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing INSERT policy that requires membership before creation
DROP POLICY IF EXISTS "authenticated_users_can_insert_conversations" ON public.conversations;
DROP POLICY IF EXISTS "users_can_select_own_conversations" ON public.conversations;

-- Allow INSERT when user is the creator
CREATE POLICY "users_can_insert_own_conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Allow SELECT when user is a member OR creator
CREATE POLICY "users_can_select_own_conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_member(id) OR creator_id = auth.uid());