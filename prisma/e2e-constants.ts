/**
 * Shared between prisma/seed-ci.ts and e2e/*.spec.ts (Phase 12a). Deliberately
 * its own file with zero imports — the spec files need these constants at
 * module load time, and Playwright's TS transform chokes on the generated
 * Prisma client (`app/generated/prisma/client.ts`) if a spec file pulls it in
 * transitively via `prisma/seed-ci.ts` ("exports is not defined in ES module
 * scope"). Keeping this file Prisma-free avoids that entirely.
 */

// Real, working login credential for Playwright E2E specs — every other user
// prisma/seed-ci.ts creates has password: "not-a-real-hash" on purpose (they
// only ever back findFirstOrThrow-style Vitest fixtures, never a real login
// attempt).
export const E2E_ADMIN_USERNAME = "e2e-admin";
export const E2E_ADMIN_PASSWORD = "E2eTestPass123";

// One real, downloadable report + on-disk file so e2e/report-search.spec.ts
// can exercise an actual download response, not just a 200 on the page.
export const E2E_REPORT_CODE = "E2E-RPT-001";
export const E2E_FILE_RELATIVE_PATH = "e2e/blank-form.pdf";
export const E2E_DEPARTMENT_CODE = "E2E-FIXTURE-DEPT";
export const E2E_DEPARTMENT_NAME = "E2E Fixture Department";

// A dedicated category (not `categories.findFirst()`'s ambiguous "whatever
// already exists" fixture other suites use) — the dev DB already has
// Finance/OPD etc. seeded, so reusing findFirst() here would make
// e2e/report-admin-crud.spec.ts's category-select assertion depend on
// whichever category happens to sort first, which isn't stable.
export const E2E_CATEGORY_CODE = "E2E-FIXTURE-CAT";
export const E2E_CATEGORY_NAME = "E2E Fixture Category";
