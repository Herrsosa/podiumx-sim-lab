import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDmConversations } from '@/hooks/useDmConversations';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { Skeleton } from '@/components/ui/skeleton';

export default function LockerMessages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversationId') || undefined;
  const { data: conversations, isLoading } = useDmConversations();

  const handleSelectConversation = (id: string) => {
    setSearchParams({ tab: 'messages', conversationId: id });
  };

  const handleBack = () => {
    setSearchParams({ tab: 'messages' });
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
        <ConversationList
          conversations={conversations || []}
          selectedId={conversationId}
          onSelect={handleSelectConversation}
        />
      </div>

      <div className={`${!conversationId ? 'hidden md:flex' : 'flex'} flex-col`}>
        {conversationId ? (
          <MessageThread conversationId={conversationId} onBack={handleBack} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
