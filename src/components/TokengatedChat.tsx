import { useState, useEffect, useRef } from 'react';
import { Send, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  user_id: string;
  athlete_id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
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

  useEffect(() => {
    // Fetch initial messages
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${athleteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `athlete_id=eq.${athleteId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Fetch the profile data for the new message
          supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', newMsg.user_id)
            .single()
            .then(({ data: profile }) => {
              setMessages((prev) => [...prev, { ...newMsg, profiles: profile }]);
            });
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
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url
        )
      `)
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !canSend) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
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
    <Card className="glass-card">
      <CardHeader>
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
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="h-[400px] space-y-3 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              No messages yet. Be the first to start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <img
                  src={message.profiles?.avatar_url || '/placeholder.svg'}
                  alt={message.profiles?.display_name || 'User'}
                  className="h-8 w-8 rounded-full ring-2 ring-primary/20"
                />
                <div className="flex-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-sm font-semibold">
                      {message.profiles?.display_name || 'Anonymous'}
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
        {!canSend ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
            <Lock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="mb-3 text-sm text-muted-foreground">
              Hold at least 1 {athleteName} token to unlock chat
            </p>
            <Button onClick={onBuyClick} size="sm">
              Buy 1 Token to Unlock
            </Button>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
