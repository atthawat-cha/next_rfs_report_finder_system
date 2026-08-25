import { test, expect } from '@playwright/test';
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD } from '../prisma/e2e-constants';

test.describe('locale switch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(E2E_ADMIN_USERNAME);
    await page.locator('#password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('LocaleToggle flips en -> th, string changes, choice persists across reload', async ({ page }) => {
    await expect(page.getByText('Total Reports')).toBeVisible();

    await page.getByTestId('locale-toggle').click();
    await expect(page).toHaveURL(/\/th\/dashboard/);
    await expect(page.getByText('รายงานทั้งหมด')).toBeVisible();

    // localeDetection is deliberately off (phase11-plan.md's resolved
    // decisions) — an unprefixed /dashboard always serves English, on
    // purpose, so bookmarks stay stable regardless of any past switch. The
    // thing that should actually persist across a reload is the /th prefix
    // itself, once the URL already carries it.
    await page.reload();
    await expect(page).toHaveURL(/\/th\/dashboard/);
    await expect(page.getByText('รายงานทั้งหมด')).toBeVisible();
  });
});
