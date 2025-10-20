import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface DmMessage {
  id: string;
  sender_id: string;
  body: string;
  media_url: string | null;
  created_at: string;
}

export function useDmMessages(conversationId: string | undefined) {
  const queryResult = useQuery({
    queryKey: ['dm-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase.rpc('get_dm_messages', {
        p_conversation_id: conversationId,
      });

      if (error) throw error;
      return (data || []) as DmMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          void queryResult.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryResult]);

  return queryResult;
}
