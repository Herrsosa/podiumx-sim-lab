import type { User } from '@supabase/supabase-js';

const FOUNDER_EMAILS = new Set(['nilshertzner@hotmail.de']);

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

export function isFounderUser(user: User | null | undefined) {
  const primaryEmail = normalizeEmail(user?.email);
  if (primaryEmail && FOUNDER_EMAILS.has(primaryEmail)) {
    return true;
  }

  const identities = ((user as { identities?: Array<{ identity_data?: { email?: string | null } }> | null })?.identities ??
    []) as Array<{ identity_data?: { email?: string | null } }>;

  return identities.some((identity) => {
    const identityEmail = normalizeEmail(identity.identity_data?.email);
    return Boolean(identityEmail && FOUNDER_EMAILS.has(identityEmail));
  });
}
