import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDmMessages } from '@/hooks/useDmMessages';
import { useSendDm } from '@/hooks/useSendDm';
import { useUser } from '@/store/auth';
import { resolveAvatarUrl } from '@/utils/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface MessageThreadProps {
  conversationId: string;
  onBack: () => void;
}

export function MessageThread({ conversationId, onBack }: MessageThreadProps) {
  const user = useUser();
  const [messageInput, setMessageInput] = useState('');
  const listRef = useRef<List>(null);
  const { data: messages, isLoading } = useDmMessages(conversationId);
  const sendMutation = useSendDm(conversationId);
  const itemHeight = 108;
  const listHeight = 420;

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    listRef.current?.scrollToItem(messages.length - 1, 'end');
  }, [messages]);

  const handleSend = async () => {
    if (!messageInput.trim()) return;

    const content = messageInput;
    setMessageInput('');
    await sendMutation.mutateAsync(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-semibold">Messages</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        {messages && messages.length > 0 ? (
          <List
            height={listHeight}
            itemCount={messages.length}
            itemSize={itemHeight}
            width="100%"
            ref={listRef}
          >
            {({ index, style }: ListChildComponentProps) => {
              const message = messages[index];
              const isOwn = message.sender_id === user?.id;

              return (
                <div
                  style={style}
                  className={`flex gap-3 px-4 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {!isOwn && (
                    <Avatar className="mt-2 h-8 w-8 flex-shrink-0">
                      <AvatarImage src={resolveAvatarUrl(null, { size: 32 })} />
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`flex max-w-[70%] flex-col ${
                      isOwn ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line break-words">
                        {message.body}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            }}
          </List>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t p-4">
        <Input
          placeholder="Type a message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sendMutation.isPending}
        />
        <Button
          onClick={handleSend}
          disabled={!messageInput.trim() || sendMutation.isPending}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
