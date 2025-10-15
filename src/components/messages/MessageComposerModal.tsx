import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getOrCreateConversation, sendMessage } from "@/lib/messages";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const MAX_LENGTH = 500;

type MessageComposerModalProps = {
  targetUserId: string;
  targetHandle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenInbox?: () => void;
};

export function MessageComposerModal({
  targetUserId,
  targetHandle,
  open,
  onOpenChange,
  onOpenInbox,
}: MessageComposerModalProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 10);
    } else {
      setMessage("");
      setIsSending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!textAreaRef.current) return;
    const element = textAreaRef.current;
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  }, [message]);

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast({
        title: "Message is empty",
        description: "Write a quick note before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const conversationId = await getOrCreateConversation(targetUserId);
      const reply = await sendMessage(conversationId, trimmed);

      queryClient.setQueryData<Message[]>(["dm_messages", conversationId], (previous) => {
        if (!previous) {
          return previous;
        }
        return [...previous, reply];
      });

      setMessage("");
      handleClose();
      toast({ title: "Message sent" });
    } catch (error: unknown) {
      toast({
        title: "Message failed",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const remaining = MAX_LENGTH - message.length;
  const disabled = message.trim().length === 0 || message.length > MAX_LENGTH || isSending;
  const displayHandle = targetHandle || "@athlete";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message {displayHandle}</DialogTitle>
          <DialogDescription>
            Send a quick update or start a new conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Textarea
            ref={textAreaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MAX_LENGTH}
            placeholder="Write your message..."
            className="min-h-[120px] resize-none text-sm"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{remaining} characters left</span>
            <Button
              variant="link"
              className="px-0 text-xs"
              onClick={() => {
                handleClose();
                onOpenInbox?.();
              }}
            >
              Open full inbox
            </Button>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={disabled}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MessageComposerModal;
