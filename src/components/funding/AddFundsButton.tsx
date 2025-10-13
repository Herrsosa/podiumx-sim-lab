import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AddFundsDialog } from './AddFundsDialog';

interface AddFundsButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function AddFundsButton({ variant = 'default', size = 'default' }: AddFundsButtonProps) {
  const [open, setOpen] = useState(false);

  // Gate feature with env flag
  const isTestFundingEnabled = import.meta.env.VITE_TEST_FUNDING_ENABLED === 'true';
  
  if (!isTestFundingEnabled) {
    return null;
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Test Funds
      </Button>
      <AddFundsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
