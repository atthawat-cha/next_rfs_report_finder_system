# Phase 10 — Report Editor Tabbed Redesign (Info / Param / Query / Sub / Doc / History)

## Context

User-provided wireframe (`document/wriefream/1.png`) asked for the report create/edit form to be
restructured behind a tab bar: **Info / Param / Query / Sub / Doc**. A clickable HTML demo (design
review only, no code changes) was built and reviewed with the user before any implementation — see
chat history 2026-08-23. The user confirmed the tab-to-feature mapping and two follow-up decisions:

**Resolved decisions (user, 2026-08-23):**

1. **Param** = `report_variables` (already supports multiple rows — no schema change).
2. **Query** = `report_queries`, split into **Main Query** (the single `is_main=true` row) and
   **Sub Queries** (the rest) — both groups reuse the existing `is_main` flag; no schema change to
   `report_queries` itself.
3. **Sub** = **Sub-reports** — a brand-new concept, not in the schema today. A sub-report is either
   (a) an uploaded child report-design file (e.g. a Jasper `.jrxml`/Crystal `.rpt`/reference PDF), or
   (b) a link to another existing `reports` row in the system — placed at a named **slot**
   (`HEADER`/`DETAIL`/`FOOTER`) within the parent report.
4. **Doc** = `report_files` (existing BLANK_FORM/SAMPLE_FILLED_FORM/SAMPLE_DATA, kept exactly as-is)
   **plus** a new **REFERENCE_DOC** file kind for free-form supporting documents (multiple at once —
   not a single replaceable slot like the other three kinds) **plus** `report_shares` (Sharing) moved
   into this tab, since both are about previewing/downloading report-adjacent documents.
5. **History** (`report_versions`/file+query version history — already existed as its own card) stays
   its **own separate tab**, not folded into Doc.
6. **`report-create` and `report-edit` share the same tab shell.** On create, only the Info tab is
   interactive; Param/Query/Sub/Doc/History are visible but disabled (with a hint) because none of
   those child rows can exist before the report itself has an id. After a successful create, the
   user is redirected to `report-edit/[id]` (**changed from today's redirect to `report-list`**) so
   they land directly on the now-enabled tabs instead of having to navigate back in.
7. The ACL "จัดการสิทธิ์" button/drawer (`ReportPermissionsDrawer`, view/edit/delete/favorite/export/
   print grants) stays a page-level header action, outside the tabs — it is a different concern from
   document sharing.

## Scope boundaries

- No change to `output_type`-driven file kinds (`BLANK_FORM`/`SAMPLE_FILLED_FORM`/`SAMPLE_DATA`),
  their upload/replace/version semantics, or the ACL model.
- No change to how `report_queries`/`report_variables` are stored — this is a **presentation-only**
  regrouping of the Query tab (main vs. sub), not a schema change to that table.
- Sub-reports do **not** get their own version-history sub-list in this phase (MVP — matches the
  project's existing "not blocked even if it's the only one" stance on `report_files`/
  `report_queries` DELETE). Editing a sub-report is limited to its `name`/`slot`/`sort_order`;
  changing the underlying file or linked report means delete + re-add.
- No AV scanning of uploaded sub-report files (matches Phase 4c's deferred stance on `report_files`).

## Data model changes (Sub-phase 10a)

```prisma
enum SubReportSlot {
  HEADER
  DETAIL
  FOOTER
}

enum SubReportSourceType {
  UPLOAD
  LINKED_REPORT
}

model report_sub_reports {
  id               String              @id
  report_id        String
  name             String
  slot             SubReportSlot       @default(DETAIL)
  source_type      SubReportSourceType
  linked_report_id String?
  file_path        String?
  file_name        String?
  file_type        String?
  file_size        BigInt?
  sort_order       Int                 @default(0)
  created_by       String
  created_at       DateTime            @default(now())
  reports          reports  @relation("report_sub_reports_report", fields: [report_id], references: [id], onDelete: Cascade)
  linked_report    reports? @relation("report_sub_reports_linked", fields: [linked_report_id], references: [id], onDelete: SetNull)

  @@index([report_id])
}
```

`reports` gains two back-relations: `report_sub_reports report_sub_reports[] @relation("report_sub_reports_report")`
and `linked_as_sub_report report_sub_reports[] @relation("report_sub_reports_linked")`.

`FileKind` enum gains one value: `REFERENCE_DOC` (free-form supporting documents shown in the Doc
tab — unlike the other three kinds, multiple `REFERENCE_DOC` rows can be `is_current: true` at once
for the same report, since they are independent items, not versions of one slot).

**Migration safety (per `CLAUDE.md`):** run `npx prisma migrate dev --create-only`, open the
generated SQL, and delete any `ALTER TABLE "reports" ALTER COLUMN "search_vector" DROP DEFAULT` line
before applying — `reports.search_vector` is a Postgres generated column that Prisma's shadow-DB
diff periodically misdiagnoses, and (per the documented Phase 4d incident) a failing migration does
**not** roll back the DDL statements that ran before the bad line, so inspecting first is mandatory,
not optional, any time a migration's diff touches `reports` or a table that references it.

## API changes (Sub-phase 10a)

- **`app/api/reports/[id]/sub-reports/route.ts`** (new) — admin-only (`routeAcceptted('admin')`,
  same pattern as `queries`/`variables`/`files` routes):
  - `GET` — list `report_sub_reports` for this report, ordered by `slot` then `sort_order`.
  - `POST` (multipart) — fields `name`, `slot`, `source_type`. If `source_type=UPLOAD`, also `file`
    (accepts `.jrxml`, `.rpt`, `.pdf` — reuses `lib/reportFileUploadServices.ts`'s pattern but a new
    `UPLOAD_FOLDER`/allow-list, since sub-report design files aren't PDFs-only like `BLANK_FORM`). If
    `source_type=LINKED_REPORT`, also `linked_report_id` (validated to reference an existing report,
    can't self-reference the parent).
  - `PUT` — update `name`/`slot`/`sort_order` only (no re-upload/re-link — see Scope boundaries).
  - `DELETE?id=` — remove one row; if `source_type=UPLOAD`, best-effort delete the stored file
    (mirrors `report_files` DELETE's `deleteReportFile` call).
- **`app/api/reports/[id]/files/route.ts`** (existing, extended):
  - `VALID_KINDS_BY_OUTPUT_TYPE` stays for the 3 existing kinds; `REFERENCE_DOC` is allowed for
    **any** `output_type` (checked separately, not through that map).
  - `POST`: when `file_kind=REFERENCE_DOC`, skip the "demote previous current of same kind" step —
    every upload becomes an additional row (`is_current: true` on all of them; the field is
    meaningless for this kind but kept for schema consistency rather than adding a nullable column
    used by only one enum value).
  - `DELETE`: accepts `?id=<report_files.id>` (new) as an alternative to `?fileKind=` — required for
    `REFERENCE_DOC` since multiple rows share a kind and `?fileKind=` alone can't disambiguate.
    `?fileKind=` keeps working unchanged for the 3 singular kinds.
- **`app/api/reports/report/manage/route.ts`** (existing, unchanged endpoint) — no change; still the
  create endpoint. `report-create` page's redirect target changes (frontend only, decision #6).

## Frontend changes

### Sub-phase 10b — Tab shell + `report-edit/[id]/page.tsx`

- `components/ui/tabs.tsx` (new) — standard shadcn primitive over `@radix-ui/react-tabs` (new
  dependency — every other Radix primitive in this repo already follows this exact pattern, see
  `components.json`/`components/ui/*.tsx`).
- Rebuild `report-edit/[id]/page.tsx` around `<Tabs>`:
  - **Info** — today's "Report Information" + "Report Settings" two-card grid, unchanged content.
  - **Param** — today's Variables card, unchanged content.
  - **Query** — today's Queries card, split into a "Main Query" section (the row where
    `is_main === true`, or an empty state prompting to add one / promote one) and a "Sub Queries"
    section (all other rows) — same CRUD handlers, just regrouped rendering.
  - **Sub** (new) — fetches/renders `report_sub_reports`; add-row form toggles between file upload
    and a report picker (`Select` populated from `GET /api/reports/report/manage` — reuse the
    existing admin list endpoint, excluding the current report's own id).
  - **Doc** — today's Files card (unchanged) + a new "เอกสารอ้างอิงเพิ่มเติม" section
    (`REFERENCE_DOC`, list + multi-upload via `FileUpload`) + today's Sharing card moved in from the
    page bottom.
  - **History** — today's Version History card, moved into its own tab, unchanged content.
- All state/handlers already used by these cards move as-is; this sub-phase is a **structural
  regroup**, not a rewrite of working CRUD logic, except where explicitly noted above (Query
  grouping, new Sub-report state, new reference-doc state, files DELETE call sites passing `id`
  where relevant).

### Sub-phase 10c — Apply the same shell to `report-create/page.tsx`

- Wrap the existing create form in the same `<Tabs>` shell for visual consistency.
- `TabsTrigger` for Param/Query/Sub/Doc/History gets `disabled` + a tooltip/hint
  ("บันทึกข้อมูลพื้นฐานก่อน") since no `report_id` exists yet.
- On successful create, redirect to `/reports/report-edit/${id}` instead of `/reports/report-list`
  (decision #6) — the manage POST endpoint's response already returns `{ data: { id } }`, no backend
  change needed for this.

## Verification

**10a:**
- `npx prisma migrate dev --create-only` → inspect SQL, confirm no `search_vector DROP DEFAULT`
  line (delete it if present), then apply; `npx prisma generate`; `npx prisma migrate status` →
  up to date.
- `curl` smoke test against the live dev server (admin session cookie): create a sub-report via
  upload, create one via `linked_report_id`, `GET` lists both, `PUT` renames one, `DELETE` removes
  one and (for the upload case) the file disappears from disk.
- `curl` smoke test: upload two `REFERENCE_DOC` files to the same report → `GET /files` (or a
  dedicated listing) shows both as `is_current: true`; `DELETE?id=` removes exactly one, the other
  survives; existing `BLANK_FORM`/`SAMPLE_DATA` replace behavior unchanged (upload twice → 1 current
  row, old one `is_current:false`).
- `npx tsc --noEmit` → 0 errors; `npm run build` → exit 0.

**10b:**
- Live check: open an existing report's edit page — all 6 tabs render, Info/Param/History content
  identical to before, Query shows Main/Sub split correctly for a report with 1 main + 2 sub
  queries, Sub tab lists sub-reports and supports add (both source types)/rename/delete, Doc tab
  shows the original Files card plus reference docs plus Sharing (all three working), switching tabs
  and back preserves in-progress edits (controlled state, not remounted forms).
- `npx tsc --noEmit` → 0 errors; `npm run build` → exit 0; `npm test` → green.

**10c:**
- Live check: `report-create` shows all 6 tab labels, only Info is interactive, submitting creates
  the report and lands on `report-edit/[id]` with the same tabs now enabled.
- `npx tsc --noEmit` → 0 errors; `npm run build` → exit 0.

## Progress doc updates

- `document/00-progress.md` — new Phase 10 row/table, sub-phase commits, "ตอนนี้อยู่ตรงไหน" refreshed.
- `document/feature-list.md` — flip any row this touches (sub-report / doc management) if present.
