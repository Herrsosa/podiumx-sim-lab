import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Auth from '@/pages/Auth';
import { MessageComposerModal } from '@/components/messages/MessageComposerModal';

interface StartConversationButtonProps {
  athleteId: string;
  athleteName: string;
  athleteHandle?: string;
}

export function StartConversationButton({ athleteId, athleteName, athleteHandle }: StartConversationButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [composerOpen, setComposerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Modal composer keeps conversations inline; auth dialog handles guests without routing away.
  const handleStartConversation = () => {
    if (!user) {
      setAuthOpen(true);
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
        onOpenInbox={() => navigate('/me?tab=messages')}
      />

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-lg overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg">Sign in to message athletes</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto px-6 pb-6">
            <Auth />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StartConversationButton;
