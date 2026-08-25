import { defineConfig, devices } from '@playwright/test';

/**
 * E2E golden-path suite (Phase 12a) — separate from vitest.config.ts's
 * `**\/*.test.ts` unit/integration suite; specs live under e2e/*.spec.ts so
 * the two never collide. Chromium only (see phase12-plan.md's resolved
 * decisions — no Firefox/WebKit matrix, keeps CI cost down).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:3501',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // `next start` (production build) only — `next dev`'s compile-on-request
  // first hit is flaky under Playwright's default navigation timeout.
  // Locally this reuses whatever's already listening on :3501 (the normal
  // `npm run dev` loop) so `npx playwright test` works with zero extra
  // steps; in CI (CI=true) it always builds + starts fresh, since a runner
  // has nothing listening yet — see .github/workflows/ci.yml's `e2e` job,
  // which runs migrations/seed first and then just invokes
  // `npx playwright test` directly, letting this block own the build+start.
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://localhost:3501',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
