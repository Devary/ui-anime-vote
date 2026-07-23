/// <reference types="cypress" />

export interface Session {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number;
  subject: string;
  username: string;
  email: string | null;
  roles: string[];
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Registers a brand-new user through the API and yields its session. */
      freshUserSession(): Chainable<Session>;
      /** Logs an existing user in through the API and yields its session. */
      apiLogin(username: string, password: string): Chainable<Session>;
      /** Visits a path with the given session pre-seeded in localStorage. */
      visitWithSession(session: Session | null, path?: string): Chainable<Cypress.AUTWindow>;
    }
  }
}

const toSession = (body: Omit<Session, 'expiresAt'>): Session =>
  ({ ...body, expiresAt: Date.now() + body.expiresIn * 1000 });

Cypress.Commands.add('freshUserSession', () => {
  const username = 'cy' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return cy.request('POST', '/api/auth/register', {
    username,
    email: `${username}@test.local`,
    password: 'Testpass123!',
    confirmPassword: 'Testpass123!',
  }).then(({ body }) => toSession(body));
});

Cypress.Commands.add('apiLogin', (username: string, password: string) =>
  cy.request('POST', '/api/auth/login', { username, password })
    .then(({ body }) => toSession(body)));

Cypress.Commands.add('visitWithSession', (session: Session | null, path = '/') =>
  cy.visit(path, {
    onBeforeLoad(win) {
      if (session) win.localStorage.setItem('anime_auth', JSON.stringify(session));
      win.localStorage.setItem('anime_lang', 'en'); // deterministic language per test
    },
  }));

export {};
