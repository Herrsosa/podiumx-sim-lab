import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ConnectXButtonProps {
  label?: string;
  className?: string;
  buttonProps?: Omit<ButtonProps, 'onClick' | 'children' | 'className'>;
}

export default function ConnectXButton({ label = 'Connect X', className, buttonProps }: ConnectXButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const { error } = await supabase.auth.linkIdentity({
      provider: 'twitter',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      console.error('X linking failed', error);
      alert('Could not start X linking. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={cn('w-full md:w-auto', className)}
      {...buttonProps}
    >
      {loading ? 'Opening X…' : label}
    </Button>
  );
}
