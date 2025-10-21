import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const [message, setMessage] = useState('Finishing X linking…');

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;

      if (error || !data.session) {
        setMessage('Linking failed. Please try again.');
        return;
      }

      setMessage('X account linked! You can close this tab.');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return <div className='p-6 text-center'>{message}</div>;
}
