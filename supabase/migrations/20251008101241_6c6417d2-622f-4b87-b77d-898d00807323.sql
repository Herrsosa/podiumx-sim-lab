-- Fix foreign key constraints to reference profiles table instead of auth.users

-- Drop existing foreign key on conversation_participants
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;

-- Add foreign key referencing profiles table
ALTER TABLE public.conversation_participants
ADD CONSTRAINT conversation_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix dm_messages sender_id foreign key
ALTER TABLE public.dm_messages
DROP CONSTRAINT IF EXISTS dm_messages_sender_id_fkey;

ALTER TABLE public.dm_messages
ADD CONSTRAINT dm_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix conversations creator_id foreign key
ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_creator_id_fkey;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;