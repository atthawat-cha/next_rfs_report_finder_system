import { test, expect } from '@playwright/test';
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD, E2E_REPORT_CODE } from '../prisma/e2e-constants';

test.describe('report search and download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(E2E_ADMIN_USERNAME);
    await page.locator('#password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('search finds the seeded report and opens its detail page', async ({ page }) => {
    await page.goto('/reports/report-list');
    await page.getByPlaceholder('Search...').fill(E2E_REPORT_CODE);

    // hanelerSearch() debounces 300ms before pushing ?q= — wait for the URL
    // to reflect it rather than an arbitrary sleep.
    await expect(page).toHaveURL(new RegExp(`q=${E2E_REPORT_CODE}`));

    // reportColumn.tsx always renders name_th for the report-list link
    // (Thai is the canonical display name across this domain, independent
    // of the active locale — see phase12-plan.md's Phase 11c precedent).
    const reportLink = page.getByRole('link', { name: 'รายงานทดสอบ E2E' });
    await expect(reportLink).toBeVisible();
    await reportLink.click();

    await expect(page).toHaveURL(/\/reports\/report-detail\//);
    // report.code renders twice on this page (breadcrumb + badge) — .first()
    // avoids a strict-mode violation, visibility of either is proof enough.
    await expect(page.getByText(E2E_REPORT_CODE).first()).toBeVisible();
  });

  test('downloads the seeded blank form as a real PDF response', async ({ page }) => {
    await page.goto('/reports/report-list');
    await page.getByPlaceholder('Search...').fill(E2E_REPORT_CODE);
    await expect(page).toHaveURL(new RegExp(`q=${E2E_REPORT_CODE}`));

    const reportLink = page.getByRole('link', { name: 'รายงานทดสอบ E2E' });
    await reportLink.click();
    await expect(page).toHaveURL(/\/reports\/report-detail\//);

    const downloadLink = page.locator('a[href*="/download"]').first();
    const href = await downloadLink.getAttribute('href');
    expect(href).toBeTruthy();

    // Issue the request through the browser context so the auth-token cookie
    // rides along, then assert the response is a real file, not a redirect
    // or an error page — the same signal a click-through download would give,
    // without the flakiness of driving an actual browser download/new-tab.
    const response = await page.request.get(href!);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/pdf');
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  });
});
