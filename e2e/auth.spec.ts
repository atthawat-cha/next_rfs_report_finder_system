import { test, expect } from '@playwright/test';
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD } from '../prisma/e2e-constants';

test.describe('auth', () => {
  test('unauthenticated visit to a protected page redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('wrong password stays on /login with an inline error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(E2E_ADMIN_USERNAME);
    await page.locator('#password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('correct login lands on /dashboard, logout redirects back to /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(E2E_ADMIN_USERNAME);
    await page.locator('#password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    // user-nav.tsx's dropdown trigger (data-testid added in Phase 12a) — open
    // it, then click the logout item (translated "Log out" in the default en
    // locale).
    await page.getByTestId('user-nav-trigger').click();
    await page.getByText('Log out').click();

    await expect(page).toHaveURL(/\/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
