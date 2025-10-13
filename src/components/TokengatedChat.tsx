import { useState, useEffect, useRef } from 'react';
import { Send, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { resolveAvatarUrl } from '@/utils/avatar';

interface Message {
  id: string;
  user_id: string;
  athlete_id: string;
  content: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
}

interface TokengatedChatProps {
  athleteId: string;
  athleteName: string;
  userHoldings: number;
  onBuyClick: () => void;
}

export default function TokengatedChat({ 
  athleteId, 
  athleteName,
  userHoldings,
  onBuyClick 
}: TokengatedChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const canSend = userHoldings >= 1;
  const isLocked = !canSend;

  useEffect(() => {
    // Fetch initial messages
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${athleteId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `athlete_id=eq.${athleteId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new;
          // Fetch the profile data for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', newMsg.user_id)
            .single();
          
          setMessages((prev) => [...prev, { 
            ...newMsg, 
            display_name: profile?.display_name,
            avatar_url: resolveAvatarUrl(profile?.avatar_url) 
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data: msgs } = await supabase
      .from('chat_messages' as any)
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!msgs) return;

    // Fetch profiles for all messages
    const userIds = [...new Set(msgs.map((m: any) => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const enrichedMessages = msgs.map((m: any) => {
      const profile = profileMap.get(m.user_id);
      return {
        ...m,
        display_name: profile?.display_name,
        avatar_url: resolveAvatarUrl(profile?.avatar_url),
      };
    });

    setMessages(enrichedMessages);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !canSend) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages' as any)
        .insert({
          athlete_id: athleteId,
          user_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="glass-card flex max-h-[var(--card-h)] flex-col overflow-hidden">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Community Chat
            {!canSend && <Lock className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
          <Badge variant="secondary">
            {userHoldings >= 1 ? 'Unlocked' : 'Locked'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 px-5 pb-4 pt-0">
        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-4 min-h-[220px]">
          {isLocked ? (
            <EmptyState
              icon={<Lock className="h-6 w-6" />}
              title="Community chat locked"
              description={`Buy at least 1 ${athleteName} token to unlock the conversation.`}
              ctaLabel="Buy 1 token to unlock"
              onCta={onBuyClick}
              className="h-full border-none bg-transparent"
            />
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              No messages yet. Be the first to start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <img
                  src={message.avatar_url || '/placeholder.svg'}
                  alt={message.display_name || 'User'}
                  className="h-8 w-8 rounded-full ring-2 ring-primary/20"
                />
                <div className="flex-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-sm font-semibold">
                      {message.display_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {!isLocked ? (
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
