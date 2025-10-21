import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function ConnectXButton() {
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
    <Button onClick={handleClick} disabled={loading} className="w-full md:w-auto">
      {loading ? 'Opening X…' : 'Connect X'}
    </Button>
  );
}
