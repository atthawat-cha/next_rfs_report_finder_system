import path from 'path';
import { test, expect } from '@playwright/test';
import {
  E2E_ADMIN_USERNAME,
  E2E_ADMIN_PASSWORD,
  E2E_CATEGORY_NAME,
  E2E_DEPARTMENT_NAME,
} from '../prisma/e2e-constants';

const FIXTURE_PDF = path.join(__dirname, 'fixtures', 'sample-upload.pdf');

test.describe('admin report create + edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(E2E_ADMIN_USERNAME);
    await page.locator('#password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('create a report via the Info tab, then edit its name on report-edit', async ({ page }) => {
    // Each run needs its own unique code — reports.code is unique. Date.now()
    // is fine here (a plain Playwright spec, not a Workflow script).
    const code = `E2E-CREATE-${Date.now()}`;

    await page.goto('/reports/report-create');

    await page.locator('#code').fill(code);
    await page.locator('#name').fill('E2E Created Report');
    await page.locator('#description').fill('Created by e2e/report-admin-crud.spec.ts');

    // Category / Department: shadcn Select on Radix — trigger is
    // label-associated via htmlFor/id, options render into a portal.
    await page.getByLabel('Category').click();
    await page.getByRole('option', { name: E2E_CATEGORY_NAME }).click();
    await page.getByLabel('Department').click();
    await page.getByRole('option', { name: E2E_DEPARTMENT_NAME }).click();

    // Hidden <input type="file"> — no visibility requirement for setInputFiles.
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PDF);

    await page.getByRole('button', { name: 'Create Report' }).click();

    // Info tab locks (fields become read-only) and a success banner with an
    // "Edit Report" link appears in place — Phase 10's "manage everything
    // starting at creation" design (see phase12-plan.md's research notes).
    // Both the toast and the persistent in-page banner contain this text —
    // .first() avoids a strict-mode violation, either one proves success.
    await expect(page.getByText('Report created successfully', { exact: false }).first()).toBeVisible();
    const editLink = page.getByRole('link', { name: 'Edit Report' });
    await expect(editLink).toBeVisible();

    await editLink.click();
    await expect(page).toHaveURL(/\/reports\/report-edit\//);

    // report-edit's Info tab fields are NOT locked (unlike report-create's
    // post-save state) — this is where further edits actually happen.
    const nameInput = page.locator('#name_th');
    await expect(nameInput).toHaveValue('E2E Created Report');
    await nameInput.fill('E2E Created Report (edited)');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Report updated successfully')).toBeVisible();

    await page.reload();
    await expect(page.locator('#name_th')).toHaveValue('E2E Created Report (edited)');
  });
});
