import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface MobileBottomBarProps {
  onAddProofOfSweat: () => void;
}

export function MobileBottomBar({ onAddProofOfSweat }: MobileBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm min-h-[56px] pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden">
      <div className="flex items-center justify-center h-full p-2">
        <Button onClick={onAddProofOfSweat} className="w-full max-w-xs gap-2">
          <Plus className="h-4 w-4" />
          Add Proof of Sweat
        </Button>
      </div>
    </div>
  );
}