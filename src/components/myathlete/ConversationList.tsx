import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { resolveAvatarUrl } from '@/utils/avatar';
import type { DmConversation } from '@/hooks/useDmConversations';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: DmConversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {conversations.map((conversation) => (
          <button
            key={conversation.conversation_id}
            onClick={() => onSelect(conversation.conversation_id)}
            className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 ${
              selectedId === conversation.conversation_id ? 'bg-muted' : ''
            }`}
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage
                src={resolveAvatarUrl(conversation.other_avatar_url, { size: 40 })}
                alt={conversation.other_display_name}
              />
              <AvatarFallback>
                {conversation.other_display_name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">
                  {conversation.other_display_name || 'Unknown User'}
                </p>
                {conversation.unread_count > 0 && (
                  <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">
                    {conversation.unread_count}
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {conversation.last_message || 'No messages yet'}
              </p>
              {conversation.last_message_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.last_message_at), {
                    addSuffix: true,
                  })}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
