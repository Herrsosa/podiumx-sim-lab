import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface StartConversationButtonProps {
  athleteId: string;
  athleteName: string;
}

export function StartConversationButton({ athleteId, athleteName }: StartConversationButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartConversation = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to send messages',
        variant: 'destructive'
      });
      return;
    }

    if (user.id === athleteId) {
      toast({
        title: 'Cannot message yourself',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    console.log('[StartConversation] Starting conversation between', user.id, 'and', athleteId);

    try {
      // Check if conversation already exists between these users
      const { data: existingParticipations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      console.log('[StartConversation] Existing participations:', existingParticipations, 'Error:', partError);

      let conversationId: string | null = null;

      if (existingParticipations && existingParticipations.length > 0) {
        // Check if any of these conversations include the athlete
        for (const participation of existingParticipations) {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', participation.conversation_id)
            .eq('user_id', athleteId)
            .maybeSingle();

          if (otherParticipant) {
            conversationId = participation.conversation_id;
            break;
          }
        }
      }

      // If no existing conversation, create a new one
      if (!conversationId) {
        console.log('[StartConversation] Creating new conversation');
        
        // Create new conversation with creator_id
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({ creator_id: user.id })
          .select()
          .single();

        console.log('[StartConversation] New conversation:', newConversation, 'Error:', convError);

        if (convError) throw convError;

        conversationId = newConversation.id;

        // Add both participants
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: athleteId }
          ]);

        console.log('[StartConversation] Participants added, error:', participantsError);

        if (participantsError) throw participantsError;

        toast({
          title: 'Conversation started',
          description: `You can now message ${athleteName}`
        });
      }

      // Navigate to messages tab
      navigate('/me?tab=messages');
      
      toast({
        title: 'Conversation ready',
        description: `You can now message ${athleteName}`
      });
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start conversation',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleStartConversation}
      disabled={isLoading}
      className="gap-2"
    >
      <MessageSquare className="h-4 w-4" />
      {isLoading ? 'Starting...' : 'Send Message'}
    </Button>
  );
}
