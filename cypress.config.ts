import { defineConfig } from 'cypress';

/**
 * E2E suite — expects the full stack running:
 *   backend  : quarkus on http://localhost:5556
 *   frontend : `npm start` (ng serve on http://localhost:4209 with /api proxy)
 */
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4209',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    retries: { runMode: 1, openMode: 0 },
  },
});
