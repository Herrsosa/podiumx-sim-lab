import { useEffect, useRef, useState } from 'react';
import { Lock, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/store/auth';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage } from '@/hooks/useChat';
import { UserAvatar } from '@/components/UserAvatar';

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
  onBuyClick,
}: TokengatedChatProps) {
  const user = useUser();
  const { messages, isLoading, isFetching, isSending, sendMessage } =
    useChat(athleteId);
  const [draft, setDraft] = useState('');
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.id === athleteId;
  const canSend = isOwner || userHoldings >= 1;
  const isLocked = !canSend;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const atBottom = scrollHeight - scrollTop <= clientHeight + 4;
    setUserHasScrolledUp(!atBottom);
  };

  useEffect(() => {
    if (isLocked) return;
    if (userHasScrolledUp) return;

    const container = scrollRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLocked, userHasScrolledUp]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !canSend) return;

    await sendMessage(trimmed);
    setDraft('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const renderMessages = () => {
    if (isLocked) {
      return (
        <EmptyState
          icon={<Lock className="h-6 w-6" />}
          title="Community chat locked"
          description={`Buy at least 1 ${athleteName} token to unlock the conversation.`}
          ctaLabel="Become a supporter"
          onCta={onBuyClick}
          className="h-full border-none bg-transparent"
        />
      );
    }

    if (isLoading || isFetching) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-[70%]" />
        </div>
      );
    }

    if (!messages.length) {
      return (
        <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
          No messages yet. Be the first to start the conversation!
        </div>
      );
    }

    return messages.map((message) => (
      <ChatMessageBubble
        key={message.id}
        message={message}
        isOwn={message.senderId === user?.id}
      />
    ));
  };

  return (
    <Card className="glass-card flex h-[500px] flex-col overflow-hidden">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Community Chat
            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
          <Badge variant="secondary">
            {canSend ? 'Unlocked' : 'Locked'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 min-h-0 px-5 pb-4 pt-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-[220px] flex-1 space-y-3 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-4"
        >
          {renderMessages()}
          <div ref={endRef} />
        </div>

        {!isLocked && (
          <div className="flex gap-2">
            <Input
              placeholder="Type a message…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={!draft.trim() || isSending}
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

function ChatMessageBubble({
  message,
  isOwn,
}: {
  message: ChatMessage;
  isOwn: boolean;
}) {
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayName =
    message.sender?.display_name || message.sender?.id || 'Anonymous';

  return (
    <div
      className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse text-right' : ''}`}
    >
      <UserAvatar
        src={message.sender?.avatar_url}
        seed={message.sender?.username ?? message.senderId}
        alt={displayName}
        size={36}
        className="ring-2 ring-primary/20"
      />

      <div
        className={`flex max-w-[75%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}
      >
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-sm font-semibold">{displayName}</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
        <div
          className={`whitespace-pre-line break-words rounded-lg px-4 py-2 text-sm ${isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-foreground shadow-sm'
            }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
