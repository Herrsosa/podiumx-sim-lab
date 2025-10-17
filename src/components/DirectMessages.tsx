import { useState, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resolveAvatarUrl } from '@/utils/avatar';

const PAGE_SIZE = 20;

interface Conversation {
  id: string;
  updated_at: string | null;
  other_participant: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
  last_message: {
    content: string;
    created_at: string | null;
  } | null;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
}

interface RpcConversationRow {
  conversation_id: string;
  updated_at: string | null;
  other_user_id: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  unread_count: number | null;
  last_message: string | null;
  last_message_at: string | null;
}

export function DirectMessages() {
  const user = useUser();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const mapRpcRow = useCallback((row: RpcConversationRow): Conversation => {
    const fallbackTimestamp = row.updated_at ?? row.last_message_at ?? null;

    return {
      id: row.conversation_id,
      updated_at: fallbackTimestamp,
      other_participant: {
        id: row.other_user_id ?? '',
        display_name: row.other_display_name ?? 'Unknown',
        avatar_url: resolveAvatarUrl(row.other_avatar_url),
      },
      last_message: row.last_message
        ? {
            content: row.last_message,
            created_at: row.last_message_at ?? fallbackTimestamp,
          }
        : null,
      unread_count: row.unread_count ?? 0,
    };
  }, []);

  const fetchConversations = useCallback(
    async (targetPage: number, reset = false) => {
      if (!user) return;

      if (reset) {
        setIsLoading(true);
        setPage(0);
        setHasMore(false);
      } else {
        setIsFetchingMore(true);
      }

      try {
        const { data, error } = await supabase.rpc('get_dm_conversations', {
          p_user: user.id,
          p_limit: PAGE_SIZE,
          p_offset: targetPage * PAGE_SIZE,
        });

        if (error) {
          throw error;
        }

        const mapped = (data ?? []).map(mapRpcRow);

        setConversations((prev) => {
          if (reset) {
            return mapped;
          }

          const merged = new Map(prev.map((conversation) => [conversation.id, conversation]));
          mapped.forEach((conversation) => {
            merged.set(conversation.id, conversation);
          });

          return Array.from(merged.values()).sort((a, b) => {
            const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bTime - aTime;
          });
        });

        setPage(targetPage);
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
      } catch (error) {
        console.error('Error loading conversations:', error);
        toast({
          title: 'Unable to load conversations',
          description: error instanceof Error ? error.message : 'Something went wrong',
          variant: 'destructive',
        });
      } finally {
        if (reset) {
          setIsLoading(false);
        } else {
          setIsFetchingMore(false);
        }
      }
    },
    [mapRpcRow, toast, user],
  );

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      setHasMore(false);
      return;
    }

    await fetchConversations(0, true);
  }, [fetchConversations, user]);

  const loadMoreConversations = useCallback(async () => {
    if (!user || !hasMore || isFetchingMore) return;
    await fetchConversations(page + 1, false);
  }, [fetchConversations, hasMore, isFetchingMore, page, user]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('dm_messages')
        .select('id, content, sender_id, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set(messagesData?.map((message) => message.sender_id) || [])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', senderIds);

      const formattedMessages: Message[] =
        messagesData?.map((message) => {
          const profile = profiles?.find((profileRow) => profileRow.id === message.sender_id);
          return {
            id: message.id,
            content: message.content,
            sender_id: message.sender_id,
            created_at: message.created_at,
            sender_name: profile?.display_name || 'Unknown',
            sender_avatar: resolveAvatarUrl(profile?.avatar_url),
          };
        }) ?? [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!user) return;

      const timestamp = new Date().toISOString();

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unread_count: 0 } : conversation,
        ),
      );

      await supabase
        .from('conversation_participants')
        .update({ last_read_at: timestamp })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    },
    [user],
  );

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    await fetchConversations(0, true);
  }, [fetchConversations, user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversation || !user) return;

    loadMessages(selectedConversation);
    void markAsRead(selectedConversation);

    const channel = supabase
      .channel(`dm-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        () => {
          loadMessages(selectedConversation);
          void refreshConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMessages, markAsRead, refreshConversations, selectedConversation, user]);

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    try {
      const { error } = await supabase.from('dm_messages').insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
      loadMessages(selectedConversation);
      void refreshConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    void markAsRead(conversationId);
  };

  const closeConversation = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const conversationSkeletons = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`dm-skeleton-${index}`}
          className="flex items-center justify-between rounded-lg border border-border/50 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
              <div className="h-2 w-36 rounded-full bg-muted/70 animate-pulse" />
            </div>
          </div>
          <div className="h-2 w-16 rounded-full bg-muted/70 animate-pulse" />
        </div>
      )),
    [],
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>Direct Messages</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex gap-4 p-4 md:flex-row md:items-start">
        <div className="w-full md:w-1/3">
          {isLoading ? (
            <div className="space-y-3">{conversationSkeletons}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              No conversations yet. Start messaging other athletes or fans!
            </div>
          ) : (
            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const updatedLabel = conversation.updated_at
                    ? new Date(conversation.updated_at).toLocaleString()
                    : '—';

                  const initials = conversation.other_participant.display_name
                    .split(' ')
                    .map((part) => part.charAt(0))
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`w-full rounded-lg border border-border/50 p-3 text-left transition hover:border-primary/40 ${
                        selectedConversation === conversation.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={conversation.other_participant.avatar_url || undefined}
                              alt={conversation.other_participant.display_name}
                            />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {conversation.other_participant.display_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {conversation.last_message?.content || 'No messages yet'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                          <span>{updatedLabel}</span>
                          {conversation.unread_count > 0 ? (
                            <Badge variant="secondary">{conversation.unread_count} new</Badge>
                          ) : (
                            <span className="text-muted-foreground/60">Seen</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={loadMoreConversations}
                  disabled={isFetchingMore}
                >
                  {isFetchingMore ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </ScrollArea>
          )}
        </div>

        <div className="w-full md:w-2/3">
          {selectedConversation ? (
            <div className="flex h-full flex-col rounded-xl border border-border/60">
              <div className="flex items-center justify-between border-b border-border/60 p-3">
                <div>
                  <div className="font-semibold">
                    {
                      conversations.find((conversation) => conversation.id === selectedConversation)
                        ?.other_participant.display_name
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Direct chat</div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeConversation} aria-label="Close DM">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="flex flex-col gap-1 rounded-lg border border-border/40 p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{message.sender_name}</span>
                        <span>{new Date(message.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-foreground">{message.content}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex items-center gap-2 border-t border-border/60 p-3">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={handleKeyPress}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
              <MessageSquare className="mb-2 h-6 w-6 text-muted-foreground/70" />
              Select a conversation to view messages
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
