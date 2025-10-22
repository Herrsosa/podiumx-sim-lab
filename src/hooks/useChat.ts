import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ChatMessageRow = Database['public']['Tables']['athlete_chat_messages']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface ChatMessage {
  id: string;
  athleteId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const MAX_MESSAGES = 200;

export function useChat(athleteId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    enabled: Boolean(athleteId),
    queryKey: ['athlete-chat', athleteId],
    queryFn: async () => {
      if (!athleteId) return [] as ChatMessage[];

      const { data: messageRows, error } = await supabase
        .from('athlete_chat_messages')
        .select('id, athlete_id, sender_id, content, created_at')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: true })
        .limit(MAX_MESSAGES);

      if (error) throw error;

      const rows: ChatMessageRow[] = (messageRows ?? []) as ChatMessageRow[];
      const senderIds = Array.from(new Set(rows.map((row) => row.sender_id).filter(Boolean))) as string[];

      let profileRows: ProfileRow[] = [];
      if (senderIds.length > 0) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', senderIds);

        if (profileError) throw profileError;
        profileRows = (data ?? []) as ProfileRow[];
      }

      const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]));

      return rows.map<ChatMessage>((row) => ({
        id: row.id,
        athleteId: row.athlete_id,
        senderId: row.sender_id,
        content: row.content,
        createdAt: row.created_at,
        sender: profilesById.get(row.sender_id) ?? null,
      }));
    },
  });

  useEffect(() => {
    if (!athleteId) return;

    const channel = supabase
      .channel(`athlete-chat:${athleteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athlete_chat_messages',
          filter: `athlete_id=eq.${athleteId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['athlete-chat', athleteId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!athleteId) return;
      const trimmed = content.trim();
      if (!trimmed) return;

      const { error } = await supabase.from('athlete_chat_messages').insert({
        athlete_id: athleteId,
        content: trimmed,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      if (!athleteId) return;
      queryClient.invalidateQueries({ queryKey: ['athlete-chat', athleteId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chat error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
  };
}
