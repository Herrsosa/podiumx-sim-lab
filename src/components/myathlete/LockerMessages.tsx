import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDmConversations } from '@/hooks/useDmConversations';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStartDm } from '@/hooks/useStartDm';
import { useToast } from '@/hooks/use-toast';

export default function LockerMessages() {
  const params = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const conversationId = params.conversationId;
  const { data: conversations, isLoading } = useDmConversations();
  const [username, setUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const startDmMutation = useStartDm();
  const { toast } = useToast();

  const handleSelectConversation = (id: string) => {
    navigate(`/my-athlete/locker/messages/${id}`);
  };

  const handleBack = () => {
    navigate(`/my-athlete/locker/messages`);
  };

  const handleStartConversation = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    setIsSearching(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .ilike('username', trimmed)
        .maybeSingle();

      if (error) throw error;
      if (!profile) {
        toast({
          title: 'User not found',
          description: 'Double-check the username and try again.',
          variant: 'destructive',
        });
        return;
      }

      const conversation = await startDmMutation.mutateAsync(profile.id);
      setUsername('');
      navigate(`/my-athlete/locker/messages/${conversation}`);
    } catch (err) {
      toast({
        title: 'Unable to start conversation',
        description: err instanceof Error ? err.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="grid h-[600px] md:grid-cols-[320px_1fr]">
      <div className={`border-r ${conversationId ? 'hidden md:block' : ''}`}>
        <div className="flex h-full flex-col space-y-4 p-4">
          <div className="rounded-lg border border-dashed p-3">
            <p className="mb-2 text-sm font-medium">Start a new conversation</p>
            <div className="flex gap-2">
              <Input
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isSearching || startDmMutation.isPending}
              />
              <Button
                onClick={handleStartConversation}
                disabled={!username.trim() || isSearching || startDmMutation.isPending}
              >
                Start
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={conversations || []}
              selectedId={conversationId}
              onSelect={handleSelectConversation}
            />
          </div>
        </div>
      </div>

      <div className={`${!conversationId ? 'hidden md:flex' : 'flex'} flex-col`}>
        {conversationId ? (
          <MessageThread conversationId={conversationId} onBack={handleBack} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a conversation or start a new one
          </div>
        )}
      </div>
    </div>
  );
}
