import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Narrowed from a repo-wide "warn" (Phase 5f, ของค้าง #11) to an `off`
    // scoped to exactly the files that have the pattern (Phase 6c). Reasoning
    // is unchanged from 5f: every one of these is the same deliberate "fetch
    // on mount" idiom (`useEffect(() => { fetchX(); }, [fetchX]) ` where
    // fetchX sets a loading flag synchronously before its first await), used
    // consistently since before Phase 5 and verified live throughout
    // Phases 4-6. The rule is a performance hint ("can hurt performance"),
    // not a correctness bug, and "properly" satisfying it in all of these
    // would mean restructuring each component's data-fetching pattern - a
    // disproportionate, regression-prone rewrite for a lint sweep whose own
    // instructions require fixes to be behaviour-preserving. Scoping (rather
    // than a blanket "warn") means a *new* file introducing this pattern
    // still gets flagged instead of silently joining the exception list -
    // exactly what happened when Phase 7b's categories/tags CRUD rebuild
    // (categoryFormDialog.tsx/tagFormDialog.tsx + their two page.tsx files)
    // hit real lint errors for the identical "fetch on mount" /
    // "sync form state from props" idiom MenuFormDialog.tsx and the
    // role-management/roles page.tsx already use. Added deliberately, not
    // silently, after confirming it's the same accepted pattern. Phase 7e's
    // support-ticket CRUD (createTicketDialog.tsx, ticketEditDialog.tsx,
    // tickets/page.tsx, tickets/manage/page.tsx) hit the identical flags for
    // the identical reason and is added the same deliberate way. Phase 10g's
    // shared tab components (components/reportEditor/*.tsx, each fetching its
    // own data via the same `useEffect(() => { fetchAll(); }, [fetchAll])`
    // idiom) and hook/useReportEditorCounts.ts (same idiom, named `refresh`)
    // hit the identical flags for the identical reason - added the same way,
    // caught late (after Phase 10 already shipped) because that phase never
    // ran `npx eslint .` as part of its own verification, only `tsc`/`test`/
    // `build`; recorded in 00-progress.md as a real process gap. Phase 11a's
    // app/[locale] restructuring (see document/phase11-plan.md) moved every
    // one of these paths down one level - updated here, not re-added, since
    // the underlying pattern/reasoning is unchanged.
    files: [
      "app/\\[locale\\]/(auth)/dashboard/components/DashboardAnalytics.tsx",
      "app/\\[locale\\]/(auth)/permissions/page.tsx",
      "app/\\[locale\\]/(auth)/reports/categories/components/categoryFormDialog.tsx",
      "app/\\[locale\\]/(auth)/reports/categories/page.tsx",
      "app/\\[locale\\]/(auth)/reports/favorites/page.tsx",
      "app/\\[locale\\]/(auth)/reports/report-create/page.tsx",
      "app/\\[locale\\]/(auth)/reports/report-edit/\\[id\\]/page.tsx",
      "app/\\[locale\\]/(auth)/reports/report-list/page.tsx",
      "app/\\[locale\\]/(auth)/reports/tags/components/tagFormDialog.tsx",
      "app/\\[locale\\]/(auth)/reports/tags/page.tsx",
      "app/\\[locale\\]/(auth)/role-management/role-form/page.tsx",
      "app/\\[locale\\]/(auth)/role-management/roles/page.tsx",
      "app/\\[locale\\]/(auth)/settings/menus/components/deleteMenuDialog.tsx",
      "app/\\[locale\\]/(auth)/settings/menus/components/menuFormDialog.tsx",
      "app/\\[locale\\]/(auth)/settings/menus/page.tsx",
      "app/\\[locale\\]/(auth)/tickets/components/createTicketDialog.tsx",
      "app/\\[locale\\]/(auth)/tickets/manage/components/ticketEditDialog.tsx",
      "app/\\[locale\\]/(auth)/tickets/manage/page.tsx",
      "app/\\[locale\\]/(auth)/tickets/page.tsx",
      "app/\\[locale\\]/(auth)/user-management/activity/page.tsx",
      "app/\\[locale\\]/(auth)/user-management/user-department/page.tsx",
      "app/\\[locale\\]/(auth)/user-management/user-form/page.tsx",
      "app/\\[locale\\]/(auth)/user-management/user-list/page.tsx",
      "components/layouts/notification-bell.tsx",
      "components/reportEditor/docTab.tsx",
      "components/reportEditor/historyTab.tsx",
      "components/reportEditor/paramTab.tsx",
      "components/reportEditor/queryTab.tsx",
      "components/reportEditor/subTab.tsx",
      "components/shared/fileuploading.tsx",
      "components/shared/reportFilePreview.tsx",
      "components/shared/reportPermissionsDrawer.tsx",
      "components/shared/reportPreviewDialog.tsx",
      "hook/useReportEditorCounts.ts",
      "hook/useStore.ts",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // `useReactTable()` (@tanstack/react-table) returns functions that can't
    // be memoized safely, so the React Compiler skips optimizing components
    // that call it - a diagnostic about a third-party library's API shape,
    // not a bug in this codebase, and not fixable without replacing the
    // table library. Scoped off (not repo-wide) for the same reason as the
    // override above: a new incompatible-library site elsewhere should still
    // surface.
    files: [
      "app/\\[locale\\]/(auth)/reports/categories/components/catagoriesTable.tsx",
      "app/\\[locale\\]/(auth)/reports/favorites/components/favReportTable.tsx",
      "app/\\[locale\\]/(auth)/reports/report-list/components/reportTable.tsx",
      "app/\\[locale\\]/(auth)/reports/tags/components/tagsTable.tsx",
      "app/\\[locale\\]/(auth)/tickets/components/ticketTable.tsx",
      "app/\\[locale\\]/(auth)/user-management/user-department/dept-data-table.tsx",
      "app/\\[locale\\]/(auth)/user-management/user-list/users-data-table.tsx",
      "components/shared/dataTable.tsx",
    ],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    // next.config.js stays CommonJS (module.exports) - Phase 11a wraps it
    // with next-intl's createNextIntlPlugin(), whose own setup docs use
    // require() for exactly this file type. Converting the whole file to
    // ESM (.mjs or "type": "module") to satisfy this rule would be a larger,
    // unrelated diff than the i18n change itself calls for.
    files: ["next.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
