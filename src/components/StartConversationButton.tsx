import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MessageComposerModal } from '@/components/messages/MessageComposerModal';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useUser } from '@/store/auth';

interface StartConversationButtonProps {
  athleteId: string;
  athleteName: string;
  athleteHandle?: string;
}

export function StartConversationButton({ athleteId, athleteName, athleteHandle }: StartConversationButtonProps) {
  const user = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [composerOpen, setComposerOpen] = useState(false);
  const { requireAuth, authDialog } = useAuthPrompt({
    description: 'Create an account to send direct messages to athletes.',
    ctaLabel: 'Create account',
  });

  // Modal composer keeps conversations inline; auth dialog handles guests without routing away.
  const handleStartConversation = () => {
    if (!user) {
      requireAuth();
      return;
    }

    if (user.id === athleteId) {
      toast({
        title: 'Cannot message yourself',
        variant: 'destructive',
      });
      return;
    }

    setComposerOpen(true);
  };

  const normalizedName = (athleteName || 'athlete').replace(/\s+/g, '').toLowerCase();
  const displayHandle = athleteHandle || '@' + normalizedName;

  return (
    <>
      <Button variant="outline" onClick={handleStartConversation} className="gap-2">
        <MessageSquare className="h-4 w-4" />
        Send Message
      </Button>

      <MessageComposerModal
        targetUserId={athleteId}
        targetHandle={displayHandle}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onOpenInbox={() => navigate('/my-athlete-profile?tab=messages')}
      />
      {authDialog}
    </>
  );
}

export default StartConversationButton;
