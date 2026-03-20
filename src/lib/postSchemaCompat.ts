type MaybePostgrestError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const POST_ENHANCEMENTS_STORAGE_KEY = 'athlyst-post-enhancements-enabled';
const POST_ENHANCEMENTS_ENV_ENABLED = import.meta.env.VITE_ENABLE_POST_ENHANCEMENTS === 'true';
let cachedPostEnhancementsEnabled: boolean | null = null;

const SCHEMA_KEYWORDS = [
  'post_type',
  'proof_of_contributions',
  'proof_of_contribution_artifacts',
  'monad_tx_hash',
  'location_city',
  'location_country',
  'location_country_code',
  'location_lat',
  'location_lng',
  'posts_author_id_profiles_id_fk',
];

export function isPostEnhancementSchemaError(error: unknown): error is MaybePostgrestError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as MaybePostgrestError;
  const haystack = [candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    candidate.code === '42703' ||
    candidate.code === 'PGRST200' ||
    candidate.code === 'PGRST204' ||
    SCHEMA_KEYWORDS.some((keyword) => haystack.includes(keyword))
  );
}

function readStoredPostEnhancementPreference(): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(POST_ENHANCEMENTS_STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // Ignore storage access failures and fall back to env/config.
  }

  return null;
}

export function shouldUsePostEnhancements(): boolean {
  if (!POST_ENHANCEMENTS_ENV_ENABLED) {
    return false;
  }

  if (cachedPostEnhancementsEnabled != null) {
    return cachedPostEnhancementsEnabled;
  }

  const storedPreference = readStoredPostEnhancementPreference();
  cachedPostEnhancementsEnabled = storedPreference ?? true;
  return cachedPostEnhancementsEnabled;
}

export function markPostEnhancementsUnavailable() {
  cachedPostEnhancementsEnabled = false;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(POST_ENHANCEMENTS_STORAGE_KEY, 'false');
  } catch {
    // Ignore storage access failures.
  }
}
