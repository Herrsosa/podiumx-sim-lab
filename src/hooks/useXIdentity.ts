import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthIdentity, User } from '@supabase/supabase-js';

type TwitterIdentityData = {
  user_name?: string;
  preferred_username?: string;
  avatar_url?: string;
  provider_id?: string;
};

type TwitterIdentity = AuthIdentity & { identity_data?: TwitterIdentityData | null };

export type XIdentity = {
  id: string;
  username: string;
  providerUserId?: string;
  avatarUrl?: string;
  userLabel: string;
} | null;

function isTwitterIdentity(identity: AuthIdentity | null | undefined): identity is TwitterIdentity {
  return Boolean(identity && identity.provider === 'twitter');
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function useXIdentity() {
  const [x, setX] = useState<XIdentity>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        return;
      }

      const user: User = data.user;
      const identities = user.identities ?? [];
      const twIdentity = identities.find((identity) => isTwitterIdentity(identity));
      if (!isTwitterIdentity(twIdentity)) {
        return;
      }

      const identityData: TwitterIdentityData = twIdentity.identity_data ?? {};
      const username = getString(identityData.user_name) ?? getString(identityData.preferred_username);
      if (!username) {
        return;
      }

      const avatarUrl = getString(identityData.avatar_url);
      const providerUserId = getString(identityData.provider_id);
      const identityId = twIdentity.id;

      const metadataFullName = getString(user.user_metadata?.full_name);
      const userLabel = metadataFullName ?? getString(user.email) ?? `user:${user.id.slice(0, 8)}…`;

      if (mounted) {
        setX({
          id: identityId,
          username,
          providerUserId,
          avatarUrl,
          userLabel,
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return x;
}
