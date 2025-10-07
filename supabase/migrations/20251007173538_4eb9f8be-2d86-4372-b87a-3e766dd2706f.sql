-- Create trigger to update conversation timestamp when new message is sent
DROP TRIGGER IF EXISTS update_conversation_timestamp_on_new_message ON public.dm_messages;

CREATE TRIGGER update_conversation_timestamp_on_new_message
AFTER INSERT ON public.dm_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- Enable realtime for dm_messages table (replica identity)
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;