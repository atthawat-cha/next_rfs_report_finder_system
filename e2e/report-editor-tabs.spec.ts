import { test, expect } from '@playwright/test';
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD, E2E_REPORT_CODE } from '../prisma/e2e-constants';

/**
 * Closes the last item tracked in document/00-progress.md as unverified from
 * Phase 10: tab-switching in the report-editor (Info/Param/Query/Sub/Doc/
 * History) had only ever been checked by code review + tsc/build, not a
 * real browser. TabsContent (components/ui/tabs.tsx, on Radix's default
 * Presence behavior - no forceMount) actually unmounts each tab's DOM when
 * it isn't active, so the real question is whether that unmount loses
 * anything - it shouldn't, since report-edit's Info tab form state lives in
 * the parent page component, not inside TabsContent's children.
 */
test.describe('report-editor tab switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(E2E_ADMIN_USERNAME);
    await page.locator('#password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/reports/report-list');
    await page.getByPlaceholder('Search...').fill(E2E_REPORT_CODE);
    await expect(page).toHaveURL(new RegExp(`q=${E2E_REPORT_CODE}`));

    // Fuzzy search (7d's pg_trgm) can return more than one row for a short
    // code fragment - scope to the seeded report's own row by its known
    // display name (name_th, same anchor report-search.spec.ts uses).
    const row = page.getByRole('row', { name: 'รายงานทดสอบ E2E' });
    await row.getByRole('button', { name: 'Open menu' }).click();
    // DropdownMenuItem's asChild overrides the wrapped <Link>'s implicit
    // role="link" with role="menuitem" - see the dropdown's other actions
    // (View/Preview/Download/...) for the same pattern.
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/reports\/report-edit\//);
  });

  test('each tab shows distinct content, and an unsaved Info-tab edit survives switching away and back', async ({ page }) => {
    // Info tab is active by default.
    await expect(page.getByRole('tabpanel')).toContainText('Report Information');

    const nameInput = page.locator('#name_th');
    const originalName = await nameInput.inputValue();
    const draftName = `${originalName} (unsaved draft)`;
    await nameInput.fill(draftName);

    // Switch through every other tab - each should render its own distinct
    // content, proving TabsContent actually swaps (not just visually stuck).
    const tabs: Array<{ trigger: string; expectedText: string }> = [
      { trigger: 'Param', expectedText: 'Parameters' },
      { trigger: 'Query', expectedText: 'Add Query' },
      { trigger: 'Sub', expectedText: 'Sub-reports' },
      { trigger: 'Doc', expectedText: 'Documents' },
      { trigger: 'History', expectedText: 'Version History' },
    ];

    for (const { trigger, expectedText } of tabs) {
      await page.getByRole('tab', { name: trigger }).click();
      await expect(page.getByRole('tabpanel')).toContainText(expectedText);
    }

    // Back to Info - the unsaved edit must still be there even though
    // TabsContent unmounted/remounted the Info tab's DOM in between (state
    // is lifted to the page component, not local to the tab).
    await page.getByRole('tab', { name: 'Info' }).click();
    await expect(page.locator('#name_th')).toHaveValue(draftName);

    // Restore the original value so this test doesn't leave the seed data
    // mutated for the next run (no save happens here either way, but be
    // explicit rather than relying on "never clicked Save").
    await nameInput.fill(originalName);
  });
});
