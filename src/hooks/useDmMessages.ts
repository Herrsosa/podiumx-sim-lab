import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

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

  // Mark conversation as read when opened
  useEffect(() => {
    if (!conversationId) return;

    const markAsRead = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update last_read_at for the current user in this conversation
      // Note: conversation_participants isn't in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      // Invalidate dm-conversations to update unread counts
      void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    };

    void markAsRead();
  }, [conversationId, queryClient]);

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
