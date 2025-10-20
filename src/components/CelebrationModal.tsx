
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { celebrateAura } from '@/lib/celebrate';
import { useEffect } from 'react';

interface CelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CelebrationModal({ open, onOpenChange }: CelebrationModalProps) {
  useEffect(() => {
    if (open) {
      celebrateAura();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-auto max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl">Building that Athlete Aura! ✨</DialogTitle>
          <DialogDescription className="text-lg">Workout logged — keep stacking Proof of Sweat.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
