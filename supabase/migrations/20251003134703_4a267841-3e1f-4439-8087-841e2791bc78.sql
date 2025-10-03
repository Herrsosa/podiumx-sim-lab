-- Create chat_messages table for tokengated chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read messages
CREATE POLICY "chat_messages_select_all" 
ON public.chat_messages 
FOR SELECT 
USING (true);

-- Policy: Authenticated users can insert messages
CREATE POLICY "chat_messages_insert_authenticated" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_chat_messages_athlete_id ON public.chat_messages(athlete_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);