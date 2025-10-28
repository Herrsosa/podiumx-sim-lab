import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type TwitterIdentityData = {
  user_name?: string;
  preferred_username?: string;
  avatar_url?: string;
  provider_id?: string;
};

type Identity = {
  id: string;
  provider: string;
  identity_data?: TwitterIdentityData | null;
};

type TwitterIdentity = Identity & { identity_data?: TwitterIdentityData | null };

export type XIdentity = ({
  id: string;
  username: string;
  handle: string;
  providerUserId?: string;
  avatarUrl?: string;
  userLabel: string;
  connected: true;
}) | null;

function isTwitterIdentity(identity: Identity | null | undefined): identity is TwitterIdentity {
  return Boolean(identity && identity.provider === 'twitter');
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

type UseXIdentityResult = {
  identity: XIdentity;
  isLoading: boolean;
};

export function useXIdentity(): UseXIdentityResult {
  const query = useQuery<XIdentity | null>({
    queryKey: ['identity', { provider: 'x' }],
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          return null;
        }

        const user: User = data.user;
        const identities = user.identities ?? [];
        const twIdentity = identities.find((item) => isTwitterIdentity(item));

        if (!isTwitterIdentity(twIdentity)) {
          return null;
        }

        const identityData: TwitterIdentityData = twIdentity.identity_data ?? {};
        const username = getString(identityData.user_name) ?? getString(identityData.preferred_username);
        if (!username) {
          return null;
        }

        const avatarUrl = getString(identityData.avatar_url);
        const providerUserId = getString(identityData.provider_id);
        const identityId = twIdentity.id;

        const metadataFullName = getString(user.user_metadata?.full_name);
        const userLabel = metadataFullName ?? getString(user.email) ?? `user:${user.id.slice(0, 8)}…`;

        return {
          id: identityId,
          username,
          handle: username,
          providerUserId,
          avatarUrl,
          userLabel,
          connected: true,
        };
      } catch (err) {
        console.error('Failed to load X identity', err);
        return null;
      }
    },
  });

  return {
    identity: query.data ?? null,
    isLoading: query.isLoading,
  };
}
