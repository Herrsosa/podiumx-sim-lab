const PROJECT_REF = 'ssnehmposgsczoadycms';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SESSION_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;
const TEST_USER_ID = '00000000-0000-0000-0000-ath00000001';
const TEST_EMAIL = 'athlete@example.com';

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
    onboardingCompleted: true,
    role: 'athlete',
    displayName: 'Test Athlete',
    walletBalance: 1000,
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
    const rows = [
      {
        id: TEST_USER_ID,
        username: 'test-athlete',
        display_name: 'Test Athlete',
        avatar_url: null,
        sport: 'Running',
        bio: 'This is a test athlete bio.',
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
        'content-range': contentRange(rows),
      },
      body: rows,
    });
  }).as('getProfiles');

  cy.intercept('GET', `${SUPABASE_URL}/rest/v1/posts*`, {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'content-range': '0-0/0',
    },
    body: [],
  }).as('getPosts');

  return state;
}

describe('My Athlete Page Mobile View', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.viewport('iphone-xr');
    setupAuthenticatedStubs();
    cy.visit('/my-athlete', {
      onBeforeLoad: storeSession,
    });
  });

  it('should show the mobile bottom bar with "Add Proof of Sweat" button', () => {
    cy.get('.fixed.bottom-0').should('be.visible');
    cy.contains('button', 'Add Proof of Sweat').should('be.visible');
  });

  it('should show Feed, Locker, and Chat tabs on mobile', () => {
    cy.get('[role="tablist"]').contains('Feed').should('be.visible');
    cy.get('[role="tablist"]').contains('Locker').should('be.visible');
    cy.get('[role="tablist"]').contains('Chat').should('be.visible');
    cy.get('[role="tablist"]').contains('Workout Timeline').should('not.exist');
  });

  it('clicking "Add Proof of Sweat" should open the composer modal', () => {
    cy.contains('button', 'Add Proof of Sweat').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('h2', 'Add Workout').should('be.visible');
  });

  it('Chat tab should have Community and DMs sub-tabs', () => {
    cy.get('[role="tablist"]').contains('Chat').click();
    cy.get('[role="tablist"]').contains('Community').should('be.visible');
    cy.get('[role="tablist"]').contains('DMs').should('be.visible');
  });

  it('should not have horizontal scroll on different mobile viewports', () => {
    const viewports = ['iphone-x', 'iphone-xr', 'samsung-s10'];
    viewports.forEach((viewport) => {
      cy.viewport(viewport as Cypress.ViewportPreset);
      cy.window().then((win) => {
        expect(win.document.body.scrollWidth).to.equal(win.innerWidth);
      });
    });
  });
});
