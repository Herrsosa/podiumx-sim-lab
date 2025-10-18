import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface DmConversation {
  conversation_id: string;
  other_user_id: string;
  other_display_name: string;
  other_avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export function useDmConversations() {
  const queryResult = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dm_conversations');
      if (error) throw error;
      return (data as DmConversation[]) || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('dm-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_messages',
        },
        () => {
          queryResult.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryResult.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryResult]);

  return queryResult;
}
