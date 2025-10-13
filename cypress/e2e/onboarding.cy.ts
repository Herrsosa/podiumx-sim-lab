const PROJECT_REF = 'ssnehmposgsczoadycms';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SESSION_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;
const TEST_USER_ID = '00000000-0000-0000-0000-fan00000001';
const TEST_EMAIL = 'fan@example.com';

interface SupabaseState {
  onboardingCompleted: boolean;
  role: 'fan' | 'athlete' | null;
  displayName: string;
  walletBalance: number;
}

function buildSessionResponse() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'test-refresh-token',
    user: {
      id: TEST_USER_ID,
      aud: 'authenticated',
      email: TEST_EMAIL,
    },
    expires_at: expiresAt,
  };
}

function storeSession(win: Window) {
  const sessionResponse = buildSessionResponse();
  const payload = {
    currentSession: sessionResponse,
    expires_at: sessionResponse.expires_at,
  };
  win.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function contentRange(rows: unknown[]): string {
  if (!rows.length) return '0-0/0';
  return `0-${Math.max(0, rows.length - 1)}/${rows.length}`;
}

function setupAuthenticatedStubs(stateOverrides: Partial<SupabaseState> = {}) {
  const state: SupabaseState = {
    onboardingCompleted: false,
    role: null,
    displayName: '',
    walletBalance: 0,
    ...stateOverrides,
  };

  const sessionResponse = buildSessionResponse();

  cy.intercept('POST', `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    statusCode: 200,
    body: sessionResponse,
  }).as('refreshToken');

  cy.intercept('GET', `${SUPABASE_URL}/auth/v1/user`, {
    statusCode: 200,
    body: sessionResponse.user,
  }).as('getUser');

  cy.intercept('GET', `${SUPABASE_URL}/rest/v1/profiles*`, (req) => {
    const url = new URL(req.url);
    const idFilter = url.searchParams.get('id');
    if (idFilter) {
      const rows = state.onboardingCompleted
        ? [
            {
              id: TEST_USER_ID,
              username: state.displayName || 'fan-handle',
              display_name: state.displayName || 'Fan User',
              avatar_url: null,
              sport: 'Running',
              bio: null,
              instagram_url: null,
              strava_url: null,
              onboarding_completed: true,
              role: state.role,
            },
          ]
        : [
            {
              id: TEST_USER_ID,
              username: state.displayName || null,
              display_name: state.displayName || null,
              avatar_url: null,
              sport: null,
              bio: null,
              instagram_url: null,
              strava_url: null,
              onboarding_completed: false,
              role: state.role,
            },
          ];

      req.reply({
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
          'content-range': contentRange(rows),
        },
        body: rows,
      });
      return;
    }

    const athleteRows = [
      {
        id: 'athlete-1',
        username: 'athlete-one',
        display_name: 'Athlete One',
        sport: 'Running',
        avatar_url: null,
        bio: '',
        instagram_url: null,
        strava_url: null,
        onboarding_completed: true,
        role: 'athlete',
      },
      {
        id: 'athlete-2',
        username: 'athlete-two',
        display_name: 'Athlete Two',
        sport: 'Cycling',
        avatar_url: null,
        bio: '',
        instagram_url: null,
        strava_url: null,
        onboarding_completed: true,
        role: 'athlete',
      },
    ];

    req.reply({
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'content-range': contentRange(athleteRows),
      },
      body: athleteRows,
    });
  }).as('getProfiles');

  cy.intercept('POST', `${SUPABASE_URL}/rest/v1/profiles*`, (req) => {
    const body = Array.isArray(req.body) ? req.body[0] : req.body;
    if (body?.role) {
      state.role = body.role;
    }
    if (body?.display_name) {
      state.displayName = body.display_name;
    }
    req.reply({
      statusCode: 201,
      headers: {
        'content-type': 'application/json',
        'content-range': contentRange([body]),
      },
      body: [body],
    });
  }).as('upsertProfile');

  cy.intercept('PATCH', `${SUPABASE_URL}/rest/v1/profiles*`, (req) => {
    const body = Array.isArray(req.body) ? req.body[0] : req.body;
    if (body?.onboarding_completed !== undefined) {
      state.onboardingCompleted = Boolean(body.onboarding_completed);
    }
    req.reply({
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'content-range': contentRange([body ?? {}]),
      },
      body: body ? [body] : [],
    });
  }).as('updateProfile');

  cy.intercept('GET', `${SUPABASE_URL}/rest/v1/athlete_tokens*`, (req) => {
    const rows = [
      { athlete_id: 'athlete-1', symbol: 'ATH1', supply: 100, a: 0.0002, b: 0.02, c: 1, treasury_balance: 1000, athlete_earnings: 0 },
      { athlete_id: 'athlete-2', symbol: 'ATH2', supply: 120, a: 0.0002, b: 0.02, c: 1, treasury_balance: 1200, athlete_earnings: 0 },
    ];
    req.reply({
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'content-range': contentRange(rows),
      },
      body: rows,
    });
  }).as('getTokens');

  cy.intercept('GET', `${SUPABASE_URL}/rest/v1/posts*`, {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'content-range': '0-0/0',
    },
    body: [],
  }).as('getPosts');

  cy.intercept('GET', `${SUPABASE_URL}/rest/v1/trades*`, {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'content-range': '0-0/0',
    },
    body: [],
  }).as('getTrades');

  cy.intercept('GET', `${SUPABASE_URL}/rest/v1/holdings*`, {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'content-range': '0-0/0',
    },
    body: [],
  }).as('getHoldings');

  cy.intercept('GET', `${SUPABASE_URL}/rest/v1/wallets*`, (req) => {
    const rows = [
      {
        user_id: TEST_USER_ID,
        balance: state.walletBalance,
        updated_at: new Date().toISOString(),
      },
    ];
    req.reply({
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'content-range': contentRange(rows),
      },
      body: rows,
    });
  }).as('getWallet');

  cy.intercept('POST', `${SUPABASE_URL}/rest/v1/rpc/faucet_test_usdc`, (req) => {
    const amount = req.body?.amount ?? 0;
    state.walletBalance += amount;
    req.reply({
      statusCode: 200,
      body: { balance: state.walletBalance },
    });
  }).as('faucetRpc');

  return state;
}

describe('Onboarding and access guards', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('fan skip completes onboarding and lands on portfolio', () => {
    const state = setupAuthenticatedStubs({ role: 'fan' });

    cy.visit('/onboarding', {
      onBeforeLoad: storeSession,
    });

    cy.contains("I'm a Fan").click();
    cy.get('#name').type('Finisher Fan');
    cy.contains('button', /^Continue$/).click();
    cy.wait('@upsertProfile');
    cy.contains('button', /^Continue$/).click();
    cy.contains('Skip for Now').click();
    cy.wait('@updateProfile');

    cy.location('pathname').should('eq', '/portfolio');
    cy.wrap(null).then(() => {
      expect(state.onboardingCompleted).to.be.true;
    });
  });

  it('allows marketplace access when logged out', () => {
    cy.visit('/marketplace');
    cy.location('pathname').should('eq', '/marketplace');
  });

  it('redirects logged-out users from protected routes to auth', () => {
    cy.visit('/portfolio');
    cy.location('pathname').should('eq', '/auth');
  });

  it('forces onboarding for authenticated users without completion flag', () => {
    setupAuthenticatedStubs({ onboardingCompleted: false, role: 'fan' });

    cy.visit('/marketplace', {
      onBeforeLoad: storeSession,
    });

    cy.location('pathname').should('eq', '/onboarding');
  });

  it('credits faucet funds and throttles repeat claims', () => {
    const state = setupAuthenticatedStubs({ onboardingCompleted: true, role: 'fan', walletBalance: 0 });

    cy.visit('/portfolio', {
      onBeforeLoad: storeSession,
    });

    cy.contains('Get Test USDC (+100)').click();
    cy.wait('@faucetRpc');

    cy.contains('$100 test USDC added');
    cy.wrap(null).then(() => {
      expect(state.walletBalance).to.equal(100);
    });
    cy.contains('Get Test USDC (+100)').should('be.disabled');
  });
});
