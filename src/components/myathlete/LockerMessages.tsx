import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDmConversations } from '@/hooks/useDmConversations';
import { ConversationList } from './ConversationList';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStartDm } from '@/hooks/useStartDm';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/store/auth';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const MessageThread = lazy(() =>
  import('./MessageThread').then((mod) => ({ default: mod.MessageThread })),
);

interface LockerMessagesProps {
  athleteId?: string;
  athleteName?: string;
  mode?: 'default' | 'embedded';
  initialConversationId?: string | null;
  onConversationChange?: (id: string | null) => void;
}

export default function LockerMessages({
  athleteId,
  athleteName,
  mode = 'default',
  initialConversationId = null,
  onConversationChange,
}: LockerMessagesProps) {
  const user = useUser();
  const isOwnerView = !athleteId || user?.id === athleteId;

  if (!athleteId) {
    return (
      <div className="flex h-[600px] items-center justify-center p-6 text-sm text-muted-foreground">
        Unable to load messages right now.
      </div>
    );
  }

  if (isOwnerView) {
    return (
      <OwnerLockerMessages
        mode={mode}
        initialConversationId={initialConversationId}
        onConversationChange={onConversationChange}
      />
    );
  }

  return (
    <OtherLockerMessages
      athleteId={athleteId}
      athleteName={athleteName ?? 'Athlete'}
    />
  );
}

function OwnerLockerMessages({
  mode = 'default',
  initialConversationId = null,
  onConversationChange,
}: {
  mode?: 'default' | 'embedded';
  initialConversationId?: string | null;
  onConversationChange?: (id: string | null) => void;
}) {
  const params = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const conversationIdParam = params.conversationId ?? null;
  const { data: conversations, isLoading } = useDmConversations();
  const [username, setUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [embeddedConversationId, setEmbeddedConversationId] = useState(initialConversationId);
  const startDmMutation = useStartDm();
  const { toast } = useToast();

  useEffect(() => {
    if (mode !== 'embedded') return;
    setEmbeddedConversationId(initialConversationId ?? null);
  }, [initialConversationId, mode]);

  const conversationId =
    mode === 'embedded' ? embeddedConversationId : conversationIdParam;

  const handleSelectConversation = (id: string) => {
    if (mode === 'embedded') {
      setEmbeddedConversationId(id);
      onConversationChange?.(id);
      return;
    }

    navigate(`/my-athlete/locker/messages/${id}`);
  };

  const handleBack = () => {
    if (mode === 'embedded') {
      setEmbeddedConversationId(null);
      onConversationChange?.(null);
      return;
    }

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

      if (mode === 'embedded') {
        setEmbeddedConversationId(conversation);
        onConversationChange?.(conversation);
        return;
      }

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

  return (
    <div
      className={cn(
        'grid md:grid-cols-[320px_1fr]',
        mode === 'embedded' ? 'min-h-[520px]' : 'h-[600px]',
      )}
      data-testid="locker-messages-owner"
    >
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
            {isLoading ? (
              <ConversationListSkeleton />
            ) : (
              <ConversationList
                conversations={conversations || []}
                selectedId={conversationId ?? undefined}
                onSelect={handleSelectConversation}
              />
            )}
          </div>
        </div>
      </div>

      <div className={`${!conversationId ? 'hidden md:flex' : 'flex'} flex-col`}>
        {conversationId ? (
          <Suspense fallback={<ThreadSkeleton />}>
            <MessageThread conversationId={conversationId} onBack={handleBack} />
          </Suspense>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            {isLoading ? 'Loading conversations…' : 'Select a conversation or start a new one'}
          </div>
        )}
      </div>
    </div>
  );
}

interface OtherLockerMessagesProps {
  athleteId: string;
  athleteName: string;
}

function OtherLockerMessages({ athleteId, athleteName }: OtherLockerMessagesProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: conversations, isLoading } = useDmConversations();
  const startDmMutation = useStartDm();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [shouldAutoSelect, setShouldAutoSelect] = useState(true);
  const [messageDraft, setMessageDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const firstName = useMemo(() => {
    const trimmed = athleteName.trim();
    if (!trimmed) return null;
    const [name] = trimmed.split(' ');
    const resolved = name || trimmed;
    return resolved ? resolved : null;
  }, [athleteName]);
  const messageLabel = firstName ? `Message ${firstName}` : 'Message this athlete';
  const friendlyName = firstName ?? 'this athlete';

  useEffect(() => {
    if (!shouldAutoSelect || activeConversationId || !conversations) return;
    const existing = conversations.find((conversation) => conversation.other_user_id === athleteId);
    if (existing) {
      setActiveConversationId(existing.conversation_id);
    }
  }, [shouldAutoSelect, activeConversationId, conversations, athleteId]);

  const handleSendFirstMessage = async () => {
    const trimmed = messageDraft.trim();
    if (!trimmed) return;

    setIsSending(true);

    try {
      const existingConversationId =
        activeConversationId ??
        conversations?.find((conversation) => conversation.other_user_id === athleteId)
          ?.conversation_id ??
        null;

      const conversationId =
        existingConversationId ?? (await startDmMutation.mutateAsync(athleteId));

      const { error } = await supabase.rpc('send_dm', {
        p_conversation_id: conversationId,
        p_body: trimmed,
      });

      if (error) {
        throw error;
      }

      setMessageDraft('');
      setActiveConversationId(conversationId);
      setShouldAutoSelect(true);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['dm-conversations'] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast({
        title: 'Unable to send message',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!activeConversationId) {
    return (
      <div className="flex h-[600px] flex-col p-6" data-testid="locker-messages-other">
        <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-6 text-center">
          <div>
            <h3 className="text-xl font-semibold">{messageLabel}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Send a private message directly to {friendlyName}. We&apos;ll keep the conversation inside this locker.
            </p>
          </div>
          <div className="space-y-3">
            <Textarea
              placeholder={`Say hi to ${friendlyName}...`}
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              disabled={isSending || startDmMutation.isPending || isLoading}
              rows={5}
            />
            <Button
              onClick={handleSendFirstMessage}
              disabled={
                !messageDraft.trim() || isSending || startDmMutation.isPending || isLoading
              }
            >
              {isSending || startDmMutation.isPending
                ? 'Sending...'
                : isLoading
                  ? 'Preparing...'
                  : messageLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px]" data-testid="locker-messages-other">
      <Suspense fallback={<ThreadSkeleton />}>
        <MessageThread
          conversationId={activeConversationId}
          onBack={() => {
            setActiveConversationId(null);
            setShouldAutoSelect(false);
          }}
          title={messageLabel}
        />
      </Suspense>
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading conversation…</p>
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
