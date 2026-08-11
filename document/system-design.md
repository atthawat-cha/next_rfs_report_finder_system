# System Design — RFS Report Finder System

> ต่อยอดจาก `document/requrisement.md` และ `document/new_requirement.md` เอกสารนี้เป็น **system design** ระดับ implementation: โครงสร้าง frontend / backend / API / database / infrastructure และการออกแบบด้านความปลอดภัยแบบละเอียด อ้างอิงโครงสร้างโค้ดจริงในระบบ ณ วันที่จัดทำเอกสาร (`prisma/schema.prisma`, `app/`, `lib/`) และเสนอส่วนต่อขยายตาม roadmap Phase 1–4
>
> เอกสารที่เกี่ยวข้อง: [workflow.md](./workflow.md) · [diagrams.md](./diagrams.md) · [project-specification.md](./project-specification.md) · [feature-list.md](./feature-list.md)

---

## 1. Architecture Overview

### 1.1 Architecture Style

**Modular monolith** บน Next.js App Router — หน้าเว็บ (Server/Client Components) และ API (Route Handlers) อยู่ในโปรเจกต์เดียวกัน เชื่อมต่อ PostgreSQL ผ่าน Prisma ORM ตัวเลือกนี้เหมาะกับทีมขนาดเล็ก-กลางและ internal tool ที่ต้อง ship ฟีเจอร์เร็ว โดยออกแบบให้ **แยกชั้นตรรกะ (layering) ชัดเจนภายในโมโนลิธ** เพื่อให้สามารถแยกบางส่วนออกเป็น microservice ได้ในอนาคต (เช่น background job worker, virus scan) โดยไม่ต้อง rewrite ทั้งระบบ — ระบบนี้**ไม่มี** rendering engine ใด ๆ (ดู §3.8)

หลักการออกแบบที่ยึดตลอดเอกสารนี้:

1. **Layered separation**: `Route Handler (HTTP concerns)` → `Service/lib function (business logic)` → `Prisma (data access)`. Route handler ไม่ควรมี business logic ฝังตรง ควรเรียก helper กลางเสมอ (ดู §3.4)
2. **Least privilege by default**: ทุก endpoint เช็คสิทธิ์ก่อนเสมอ (`requireAuth`/`requireRole`), ทุก query ที่คืนข้อมูลให้ผู้ใช้ทั่วไปต้อง filter ด้วยสิทธิ์ระดับรายงานเสมอ ไม่ใช่แค่ระดับเมนู
3. **Everything mutating is audited**: ทุก create/update/delete เขียนลง `activity_logs` ผ่าน helper กลางเดียว ไม่ทำซ้ำในแต่ละ route
4. **Stateless application tier**: ห้ามเก็บ state (rate-limit counters, session cache) ไว้ใน memory ของ process เดียว เพราะต้องรองรับหลาย instance ในอนาคต (Redis เป็น shared state เดียว)
5. **Storage คนละชั้นจาก database**: ไฟล์ไบนารี (pdf/excel ที่ admin อัปโหลด) ไม่ผสมกับ relational data — Object Storage แยกจาก PostgreSQL เสมอ

### 1.2 High-Level Component Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                              │
│   Next.js App Router pages · React Server/Client Components           │
│   shadcn/ui + Tailwind · Zustand (client state) · next-themes         │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS (cookie: auth-token, httpOnly)
┌───────────────────────────────▼────────────────────────────────────────┐
│                      Next.js Server (single deploy unit)               │
│  ┌────────────────────────────┐   ┌────────────────────────────────┐  │
│  │  Middleware (edge)         │   │  Route Handlers (app/api/**)   │  │
│  │  - auth gate (JWT verify)  │   │  - auth, users, reports,       │  │
│  │  - redirect rules          │   │    baseconfig, (new) search,   │  │
│  └────────────────────────────┘   │    favorites, downloads, share │  │
│                                     │  - each: requireRole → service │  │
│                                     │    → logActivity               │  │
│                                     └───────────────┬────────────────┘  │
│  ┌──────────────────────────────────────────────────▼───────────────┐  │
│  │  Service / lib layer  (lib/*.ts)                                  │  │
│  │  auth.ts · fileUploadServices.ts · imageConvert.ts ·               │  │
│  │  activity-log.ts (new) · pagination.ts (new) · report-acl.ts (new)│  │
│  └──────────────────────────────────────────────────┬───────────────┘  │
└─────────────────────────────────┬───────────────────┬──────────────────┘
                                  │ Prisma Client       │
              ┌───────────────────▼───────────┐  ┌──────▼───────────────┐
              │        PostgreSQL              │  │   Redis               │
              │  reports, users, roles,        │  │  rate-limit counters, │
              │  categories, tags, files,      │  │  cache, BullMQ queue  │
              │  queries, variables, ACL,      │  └───────────────────────┘
              │  versions, shares, logs...     │
              └────────────────────────────────┘
                                  │
              ┌───────────────────▼───────────────────────────────────┐
              │  Object Storage (MinIO/S3)  — report files, samples,  │
              │  blank forms, thumbnails, exported excel/pdf           │
              └───────────────────┬───────────────────────────────────┘
                                  │
              ┌───────────────────▼───────────────────────────────────┐
              │  Client-side rendering of the stored files themselves: │
              │  PDF → browser-native viewer (<iframe>/<embed>)        │
              │  Excel → parsed server-side (exceljs, read-only) into  │
              │  JSON rows for SharedDataTable preview                 │
              │  (no separate rendering engine/microservice — see §3.8)│
              └─────────────────────────────────────────────────────────┘
```

> **No report-rendering engine in this system.** Every PDF/Excel the app serves is a finished artifact an admin uploaded directly — there is no JasperReports (or any other) rendering microservice, and the app never parses/renders `.jasper`. See §3.8-3.9 for the full preview/download/print design.

Supporting services introduced by the roadmap (ดู §6 tech stack เพิ่ม): **Redis** (rate limit, cache, job queue broker), **BullMQ workers** (async export/notification jobs), **MinIO/S3** (object storage), **ClamAV** (virus scan sidecar), **SMTP** (email OTP/notification), **Sentry + pino** (observability).

---

## 2. Frontend Design

### 2.1 Routing & Layout

- Next.js 14 **App Router**, route groups: `app/(auth)/...` = authenticated shell, wrapped by `app/(auth)/layout.tsx` (sidebar + navbar from `components/layouts/`); `app/login/`, `app/page.tsx` = public.
- **Route-group caveat carried over from `CLAUDE.md`**: `(auth)` is stripped from the real URL. Any new protected route must be added to `middleware.ts`'s `matcher`/public-path logic based on the *real* pathname, not the folder path — this is a recurring source of auth bugs in this codebase and must be checked every time a page is added.
- Planned new route surfaces (Phase 1–3):
  - `app/(auth)/reports/report-list/[id]/edit/page.tsx` — report edit (missing today)
  - `app/(auth)/reports/report-list/[id]/preview/page.tsx` — sample-data preview
  - `app/(auth)/reports/report-list/[id]/permissions/page.tsx` — per-report ACL editor
  - `app/(auth)/reports/report-list/[id]/versions/page.tsx` — version history/rollback
  - `app/(auth)/reports/shares/page.tsx` — sharing management
  - `app/(auth)/settings/page.tsx` — system settings (auth provider, storage, theme defaults)
  - `app/(auth)/dashboard/page.tsx` — replace placeholder with real analytics widgets

### 2.2 Component Conventions

- **Primitives** in `components/ui/` (shadcn/ui, `style: new-york`, `baseColor: neutral`) — do not hand-modify generated primitives; wrap instead.
- **Composed feature components** in `components/shared/` (`dataTable.tsx`, `dialog-drawer.tsx`, `right-drawer.tsx`, `searchInput.tsx`, `permissions-form.tsx`, `fileuploading.tsx`) — reused across modules. New shared components to add: `filePreview.tsx` (sample-data preview grid), `versionTimeline.tsx`, `permissionMatrix.tsx` (per-report user/role × action grid).
- **List/table pattern** (established in `categories`/`tags` — copy for every new manageable list): `*Column.tsx` (column defs, `@tanstack/react-table` `ColumnDef[]`) + `*Table.tsx`/`*MainTable.tsx` (page-level data fetch, filters, pagination state) + `SharedDataTable` for rendering. New lists (report versions, ACL entries, activity log, shares) must follow this exact three-file split for consistency and so `SharedDataTable`'s pagination/sort props keep working.
- **Forms**: `zod` schema colocated with the form component, validated client-side before submit and re-validated server-side in the route handler (never trust client validation alone — OWASP A03/Injection mitigation).

### 2.3 State Management

- **Server state**: fetched per-page via `fetch()` to route handlers (no SWR/React Query currently) — acceptable for current scale; **recommend introducing `@tanstack/react-query`** once search/filter/pagination interactions multiply (debounced search, optimistic favorite toggle, background revalidation) to avoid hand-rolled loading/error state duplicated across every `*MainTable.tsx`.
- **Client/UI state**: `zustand` (`hook/useStore.ts`) for cross-component UI state (sidebar collapse, active theme, current user snapshot). Import path is `@/hook/...` (singular) — **not** `@/hooks` despite the shadcn alias in `components.json`; this mismatch is a known trap, keep using the real `hook/` directory.
- **Search state**: today `SearchInput`'s `hanelerSearch` is a stub. Design: debounce (300ms) → update URL query string (`?q=`) via `useRouter().replace` (so search is shareable/bookmarkable and survives refresh) → `*MainTable.tsx` reads `searchParams` and re-fetches.

### 2.4 Theming & i18n

- Dark/light via `next-themes` (`components/provider/themeProvider.tsx`) — already functional. **Gap**: theme preference is not persisted per-user server-side; add a `settings`-table-backed (or simple `users.preferences` JSON column) sync on theme change so preference follows the user across devices, not just `localStorage`.
- i18n: schema already carries `name_th`/`name_en` on `reports`. UI copy today is an inconsistent EN/TH mix. **Recommend `next-intl`** with `th` as default locale, `en` as fallback, message catalogs under `messages/th.json` / `messages/en.json`, wrapped at `app/layout.tsx`. This is a **Should**, not blocking Phase 1.

### 2.5 Data Tables & Search UX

- `@tanstack/react-table` remains the standard; server-side pagination/sort/filter (not client-side slicing) once `GET /api/reports/report/manage` and future list endpoints support `page`/`pageSize`/`sort`/`q` query params (see §4.2).
- Report discovery page combines: text search box, category/department/tag/status filter chips, and a card/table view toggle (`reportCards.tsx` already exists as the card variant).

---

## 3. Backend Design

### 3.1 Route Handler Layer (`app/api/**/route.ts`)

Every mutating/protected route handler follows this exact shape (already the dominant pattern in the codebase — formalize it, don't deviate):

```ts
export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, routeAcceptted('admin'));
  if (authResult instanceof NextResponse) return authResult;   // 401/403 short-circuit

  const body = zodSchema.parse(await req.json());              // throws → caught by handler wrapper
  const record = await someService.create(body, authResult);   // business logic in lib/, not here
  await logActivity(req, { userId: authResult.sub, action: 'create', entity: 'report', entityId: record.id });

  return NextResponse.json({ success: true, data: record }, { status: 201 });
}
```

**Known deviations to fix (carried from `new_requirement.md` gap analysis and `phase0-plan.md`)**: `POST /api/users/user` and `POST /api/users/user/update` currently have no auth check at all — must be brought into this pattern. `middleware.ts` protected-path logic is dead code relying on the wrong pathname shape — see §3.3.

### 3.2 Service Layer (`lib/*.ts`)

| File | Responsibility |
|---|---|
| `lib/auth.ts` | JWT sign/verify (`jose`), `getCurrentUser`, `getAuthFromRequest`, `requireAuth`, `requireRole`, `routeAcceptted`, login rate limiting |
| `lib/fileUploadServices.ts` | Multipart parsing, disk/object-storage write, filename sanitization |
| `lib/imageConvert.ts` | Converts uploaded images → WebP via `sharp` |
| `lib/user-management.ts` | Menu/permission tree builders (`buildMenuStructure`, `buildMenusrender`, `buildRolePermissionInsert`, `perConvertToCheckbox`) for the DB-driven permission editor |
| `lib/menu-list.ts` | Static sidebar menu source (`getMenuList(pathname)`) — **not** the same source as the DB `menus` table; see `CLAUDE.md` note on the two parallel menu systems |
| `lib/prisma.ts` | Prisma client singleton (`globalForPrisma` pattern) |
| `lib/security_get.ts` / `lib/security_post.ts` | Currently empty placeholders — do not assume active logic; either implement (e.g. centralize per-report ACL checks here) or remove |
| **`lib/activity-log.ts` (new, Phase 0)** | `logActivity(req, params)` — single write path to `activity_logs`, swallows its own errors so logging never breaks the caller |
| **`lib/pagination.ts` (new, Phase 0)** | `parsePagination(searchParams)` — shared `page`/`pageSize` parsing, capped page size |
| **`lib/redis.ts` (new, Phase 0)** | `ioredis` singleton, mirrors `lib/prisma.ts`'s global-singleton pattern |
| **`lib/report-acl.ts` (new, Phase 2)** | Resolves effective per-report permission for a `(user, report)` pair — merges role-level default with any individual `report_permissions` override; single source of truth consumed by every reports-read/download/export/favorite endpoint |
| **`lib/report-files.ts` (new, Phase 2)** | Validates file kind against the report's `output_type` (`BLANK_FORM`/`SAMPLE_FILLED_FORM` for `PRINT_FORM`, `SAMPLE_DATA` for `DATA_REPORT`), enforces per-kind MIME/size rules, orchestrates versioning on re-upload |
| **`lib/preview.ts` (new, Phase 1/2)** | Parses an uploaded `SAMPLE_DATA` Excel file server-side (`exceljs`, read-only) into `{ columns, rows }` for the in-app table preview — the only "rendering-adjacent" code in the system, and it never touches PDFs (those are previewed natively by the browser) |
| **`lib/notify.ts` (new, Phase 3)** | Producer helpers (`notifyReportShared`, `notifyReportExpiring`, ...) that insert into `notifications` and optionally enqueue an email job |

### 3.3 Auth & Middleware Design

- **Cookie**: `auth-token` (httpOnly, `SameSite=Lax`, `Secure` in production) — this is the *only* correct name; `middleware.ts` historically referenced `auth_token` in a stray unused variable, which must not be treated as the real cookie name by any new code (see `CLAUDE.md`).
- **Middleware control flow** (Edge runtime, runs before every matched request):
  1. Decode/verify user from `auth-token` (fails silently to `null`, never throws into a 500).
  2. If path is `/login` and user is authenticated → redirect to `/dashboard`.
  3. If path is in `publicPaths` → pass through.
  4. If no authenticated user → redirect to `/login?redirect=<original path>`.
  5. Otherwise pass through.
- **Route handler auth**: `requireAuth(req)` / `requireRole(req, acceptedRoles)` return either the decoded JWT payload or a `NextResponse` — callers must `instanceof` check and return it directly. `routeAcceptted(access)` maps `'admin' | 'user' | 'guest'` → concrete role name list. This is intentionally coarse (menu/route-tier) authorization; it is **not** sufficient for per-report authorization (§3.5 handles that separately).
- **Rate limiting**: login attempts keyed by identifier (IP or username), backed by Redis `INCR` + `PEXPIRE` (replacing the in-memory `Map`), **fails open** on Redis outage — deliberate choice for this internal system where rate limiting is defense-in-depth, not the primary auth boundary, and an outage should not lock out legitimate users.
- **Pluggable auth provider (Phase 4)**: introduce an `AuthProvider` interface (Strategy pattern) inside `lib/auth/` with concrete implementations `LocalDbProvider` (current bcrypt+users table), `ExternalApiProvider` (LDAP/SSO call-out), `EmailOtpProvider` (passwordless). Active provider read from the existing `settings` key/value table at request time (cached in Redis with short TTL to avoid a DB read per login attempt). This avoids migrating the whole session/JWT/role model to a third-party library like Auth.js — the custom cookie payload is already deeply threaded through role/department/permission checks, so a full migration would cost far more than adding this abstraction.

### 3.4 File Upload & Storage Pipeline

```
Client (multipart/form-data)
   → Route Handler validates field presence + file_kind (must match the report's output_type — see §3.9)
   → lib/fileUploadServices.ts: sanitize filename, check MIME allow-list per file_kind, check size limit
   → (Phase 4) ClamAV scan (reject on detection, log to activity_logs as security event)
   → images (e.g. thumbnails) → lib/imageConvert.ts → WebP
   → write to Object Storage (MinIO/S3) under `reports/{report_id}/{kind}/{version}/{filename}`
   → on re-upload of an existing file_kind → insert new report_versions row (old version marked not-current, never overwritten)
   → Prisma write of metadata row (file_path = storage key, not filesystem path)
```

Every file accepted by this pipeline is a **finished artifact the admin uploads directly** — a PDF or an Excel file that already looks the way it should. There is no report-rendering step anywhere in this pipeline; see §3.8 for how those files are then previewed/downloaded/printed.

- **Today**: files land in `public/` on local disk — works only for a single-instance, non-serverless deployment. **Design decision**: migrate to Object Storage before any multi-instance/serverless deployment; `file_path` semantics change from a relative public path to a storage object key, so **all read sites that build a public URL from `file_path` must switch to generating a signed URL at read time** — this is a breaking change to plan explicitly, not a drop-in swap.
- **File kind separation, driven by report `output_type`** (Phase 2 schema change, see §5.3): `reports` currently has exactly one file (`file_path/file_name/file_type/file_size`). This must split into a `report_files` table whose valid `file_kind` values depend on the report's `output_type`:
  - `output_type = PRINT_FORM` (ใบพิมพ์) → exactly two file kinds: `BLANK_FORM` (empty PDF form) and `SAMPLE_FILLED_FORM` (the same form shown filled with example data, PDF)
  - `output_type = DATA_REPORT` (รายงานข้อมูล) → one file kind: `SAMPLE_DATA` (an Excel file that is *both* the previewable sample data table *and* the file users download)
  - `lib/report-files.ts` rejects an upload whose `file_kind` doesn't belong to the report's `output_type` (e.g. uploading `BLANK_FORM` to a `DATA_REPORT` report is a 400, not silently accepted)

### 3.5 Per-Report Authorization Design

This is the most significant backend gap identified in `new_requirement.md` (FR-2). Design:

- New table `report_permissions` (see §5.3) with rows scoped either to a specific `user_id` (individual override) or a `role_id` (role-wide default), each carrying independent booleans: `can_view, can_edit, can_delete, can_favorite, can_export, can_print`.
- **Resolution order** (most-specific wins), implemented once in `lib/report-acl.ts` and called from every endpoint that touches a report:
  1. Individual `report_permissions` row for `(report_id, user_id)` — if present, its flags are authoritative for that user on that report.
  2. Else, role-level `report_permissions` row for `(report_id, role_id)` where `role_id` = the user's role.
  3. Else, fall back to the report's own `access_level` (`PUBLIC` visible to all authenticated users with `can_view` only; `RESTRICTED`/`PRIVATE` default-deny without an explicit grant).
- Any list endpoint aimed at non-admin users (`GET` for search/browse/favorites) must apply this resolution as a `WHERE` filter at the query level (not a post-fetch filter in application code — that leaks existence/count information and doesn't scale). Recommended implementation: a Postgres view or a Prisma raw query joining `reports` against the effective-permission logic, or (simpler for MVP) two-step: fetch candidate report IDs the user can see via a targeted query, then paginate against that ID set.
- Admin-tier endpoints (`routeAcceptted('admin')`) bypass per-report ACL entirely by design — admins manage all report metadata regardless of per-report grants; per-report ACL governs **non-admin visibility and action rights only**.

### 3.6 Activity Logging Design

- Single helper `logActivity(req, { userId, action, entity, entityId, description, metadata })` (Phase 0, see `phase0-plan.md` for the exact shape already agreed) called from every mutation handler, plus `login`/`login_failed`/`logout`.
- **Failure isolation**: logging failures are caught and `console.error`'d, never thrown — a broken audit write must never block the user's actual action. This is a deliberate availability-over-completeness tradeoff appropriate for an audit trail that's advisory, not compliance-critical, in this system's current risk profile; revisit if `activity_logs` ever becomes a compliance requirement (in which case failures should instead block the mutation or write to a durable fallback queue).
- **Transactional consistency for logs tied to a DB transaction** (e.g. role create+role_permissions insert): capture the created entity's ID *after* the `$transaction` resolves, then log — never log from inside a transaction callback that might still roll back.

### 3.7 Background Jobs (Phase 3–4)

Introduce **BullMQ + Redis** for anything that shouldn't block the request/response cycle:

| Job | Trigger | Why async |
|---|---|---|
| Excel preview parsing for unusually large sample-data files | User opens preview | Keep the request/response cycle fast; cache the parsed JSON briefly so repeat previews don't re-parse |
| Notification fan-out (report shared, report expiring soon) | Share created / cron sweep | Avoid blocking the triggering mutation; batched email sending |
| Expired share-link cleanup | Cron (hourly) | Housekeeping, no user waiting |
| Storage usage recomputation for dashboard | Cron (daily) | Aggregation over potentially large file set |

### 3.8 Preview, Download & Print Design (no rendering engine)

**There is no report-rendering engine in this system.** Earlier drafts of this design proposed a JasperReports rendering microservice — that was a misreading of the requirement. The actual need is much simpler: every file the app serves (blank form PDF, sample-filled form PDF, sample-data Excel) is **already a finished artifact** that an admin uploaded directly via §3.4. The app's job is only to store it correctly, check permissions, and present it — never to generate or render it from a source format.

Behavior is driven by the report's `output_type` (see §3.9):

**`PRINT_FORM` reports (ใบพิมพ์):**
- **Preview**: serve the PDF (`BLANK_FORM` or `SAMPLE_FILLED_FORM`) via a signed URL, rendered inline by the **browser's native PDF viewer** (`<iframe>`/`<embed>` pointed at the signed URL, or `<object type="application/pdf">`) — no server-side PDF processing at all.
- **Download**: the same signed URL with `Content-Disposition: attachment` (via a small proxy route so ACL/`downloads` logging happens first — never hand out a long-lived public signed URL directly for downloads).
- **Print**: the browser's native PDF viewer already has a print button/`Ctrl+P` that prints the PDF exactly as authored — no backend involvement needed.

**`DATA_REPORT` reports (รายงานข้อมูล):**
- **Preview**: `GET /api/reports/[id]/preview` reads the `SAMPLE_DATA` Excel file from Object Storage, parses it server-side with **`exceljs` in read mode** (first sheet, capped at e.g. 500 rows for the preview — full data is only in the downloadable file), returns `{ columns, rows }` JSON, rendered client-side with the existing `SharedDataTable` component.
- **Download**: the same `SAMPLE_DATA` Excel file served as-is via a signed-URL proxy (§3.4) — it's already the real file, nothing to generate.
- **Print**: a "Print" button on the preview table triggers `window.print()` against a `@media print` CSS layout of the currently-rendered table (client-side only, no backend call) — the user prints what they're looking at, not a server-generated PDF.

Every one of these routes still goes through the same guard as any other reports endpoint: resolve per-report ACL (§3.5) → check the flag for the requested action (`can_view`/`can_export`/`can_print`) and `reports.is_downloadable` → only then serve the file. Downloads/prints of the actual (not preview) file still write a `downloads` row and increment `download_count` atomically, exactly as in the general download workflow.

### 3.9 Report Output Type Model

New column on `reports`: `output_type: PRINT_FORM | DATA_REPORT` — set once at creation (changing it later would invalidate the report's file set, so treat it as immutable after the first file is attached; if it must change, require deleting and re-attaching files rather than allowing a silent type switch).

| `output_type` | Required `report_files.file_kind`(s) | Preview UX | Download | Print |
|---|---|---|---|---|
| `PRINT_FORM` | `BLANK_FORM` (PDF), `SAMPLE_FILLED_FORM` (PDF) | Inline browser PDF viewer | Signed-URL proxy, `attachment` disposition | Native PDF viewer print / `Ctrl+P` |
| `DATA_REPORT` | `SAMPLE_DATA` (Excel) | Server-parsed (`exceljs`) → `SharedDataTable` | Same Excel file, signed-URL proxy | Client-side `window.print()` on the table view |

This table is the single source of truth for what `lib/report-files.ts` accepts per report and what UI affordances `app/(auth)/reports/report-list/[id]/preview/page.tsx` (planned) shows — a `PRINT_FORM` report never shows a data-table preview, and a `DATA_REPORT` report never shows a PDF viewer.

---

## 4. API Design

### 4.1 Conventions

- **Response envelope** (already the pattern in `report/manage`): `{ success: boolean, data?: T, error?: string, meta?: {...} }`. Keep this consistent across every new endpoint — do not introduce a second envelope shape.
- **Errors**: HTTP status reflects the failure class (400 validation, 401 unauthenticated, 403 unauthorized-but-authenticated, 404 not found, 409 conflict e.g. duplicate `is_main` query, 429 rate-limited, 500 unexpected) with `{ success: false, error: string }` body. Validation errors from `zod` should be flattened into a readable message, never leak raw stack traces to the client.
- **Pagination**: `?page=1&pageSize=20` query params on every list endpoint, response `meta: { page, pageSize, total, totalPages }` (Phase 0 introduces this on `report/manage`; every new list endpoint must ship with it from day one — do not repeat the "unbounded list" gap).
- **Filtering/search**: `?q=` (free text), `?category=`, `?department=`, `?tag=`, `?status=` as repeatable/comma-joined query params on report list endpoints.
- **Idempotency**: `DELETE`/`PUT` on a resource that no longer exists returns 404, not 200 — avoid silent no-ops that hide bugs.

### 4.2 Endpoint Catalog

**Existing (current codebase):**

| Method & Path | Access | Purpose |
|---|---|---|
| `POST /api/auth/login` | public | Credential login, sets `auth-token` cookie |
| `POST /api/auth/logout` | authenticated | Clears cookie |
| `GET/POST /api/reports/report/manage` | admin | List (admin-only today, no pagination pre-Phase-0) / create report |
| `GET/PUT/DELETE /api/reports/report/manage/[id]` | admin | Single report read/update/delete |
| `POST /api/reports/report/manage/modify` | admin | (verify exact semantics vs `[id]` route before extending — overlapping responsibility should be reconciled, not both extended in parallel) |
| `GET/POST /api/users/user`, `/api/users/user/[id]`, `/api/users/user/update` | admin | User CRUD |
| `GET/POST /api/users/departments`, `/[id]`, `/update` | admin | Department CRUD |
| `GET/POST /api/users/roles`, `/[id]` | admin | Role CRUD |
| `GET /api/users/permissions` | admin | Permission list |
| `GET /api/baseconfig`, `/permissions`, `/selections` | mixed | Lookup/dropdown data for forms |

**Planned additions by phase** (names indicative — align with existing `report/manage` conventions):

| Method & Path | Phase | Purpose |
|---|---|---|
| `GET /api/reports/browse` | 1 | Non-admin report list, **ACL-filtered**, paginated, search+filter query params |
| `GET /api/reports/[id]/preview` | 1/2 | Sample-data preview (rows, no full download) |
| `POST /api/reports/favorites`, `DELETE /api/reports/favorites/[reportId]` | 1 | Real favorites CRUD (replace `fakedata/fakeReportList.ts`) |
| `GET /api/reports/[id]/download`, `GET /api/reports/[id]/download/blank-form`, `GET /api/reports/[id]/export/sample` | 1 | Download main file / blank form / export sample as Excel/PDF — each writes `downloads`, checks per-report ACL flag |
| `GET/POST/PUT/DELETE /api/reports/[id]/files` | 2 | `report_files` CRUD (`BLANK_FORM`/`SAMPLE_FILLED_FORM`/`SAMPLE_DATA`, validated against `output_type`), triggers versioning |
| `GET/POST/PUT/DELETE /api/reports/[id]/queries` | 2 | `report_queries` CRUD, enforces single `is_main=true` |
| `GET/POST/PUT/DELETE /api/reports/[id]/variables` | 2 | `report_variables` CRUD |
| `GET/POST/PUT/DELETE /api/reports/[id]/permissions` | 2 | `report_permissions` CRUD (per-user/per-role ACL editor) |
| `GET /api/reports/[id]/versions`, `POST /api/reports/[id]/versions/[versionId]/rollback` | 3 | Version history + rollback |
| `GET/POST/DELETE /api/reports/[id]/shares` | 3 | `report_shares` CRUD, link token generation |
| `GET /api/shares/[token]` | 3 | Public-token-gated access to a shared report |
| `GET/POST /api/notifications`, `POST /api/notifications/[id]/read` | 3 | Notification list + mark-read |
| `GET /api/dashboard/summary`, `/trends`, `/top-reports` | 3 | Dashboard aggregation endpoints |
| `GET /api/activity-logs` | 0/3 | Filterable audit log read (by user/entity/date range), admin-only |
| `GET/PUT /api/settings`, `/api/settings/[key]` | 3/4 | Settings key/value read/write (auth provider choice, storage config, defaults) |
| `POST /api/auth/2fa/setup`, `/verify` | 4 | TOTP enrollment/verification using existing `two_factor_secret` column |

### 4.3 Contract Stability

Any schema/response-shape change to an **existing** endpoint must be additive (new optional fields, new `meta` keys) to avoid breaking current frontend callers that only read `success`/`data` — this constraint is explicitly verified for the Phase 0 pagination change and should be the standing rule for every subsequent change, not a one-off note.

---

## 5. Database Design

### 5.1 Current Schema Summary (`prisma/schema.prisma`)

Core entity graph today:

- **Identity/RBAC**: `users` → `roles` (single `role_id` FK) + `user_roles` (parallel many-to-many, currently underused given the single-role FK — clarify whether multi-role-per-user is an active requirement or dead weight before extending); `roles` → `role_permissions` → `permissions` → `menus`.
- **Reports**: `reports` → `categories` (self-referencing tree via `parent_id`), → `departments` (self-referencing tree), → `report_tags` ↔ `tags`, → `report_versions`, → `report_shares`, → `favorites`, → `downloads`.
- **Cross-cutting**: `activity_logs` (polymorphic via `entity`/`entity_id` strings, not FK — intentional, since it must reference many entity types), `notifications`, `settings` (generic key/value), `support_tickets`, `user_sessions`.
- **IDs**: application-generated `faker.string.uuid()` strings for almost every model (follow this convention for new tables); `menus.id` is the sole exception using `@default(dbgenerated("gen_random_uuid()"))`.

### 5.2 Design Issues to Address (carried from gap analysis)

- `role_permissions` encodes **menu-level** CRUD flags (`can_view/can_create/can_update/can_delete` against a `permission_id` tied to a `menu_id`) — this is a different axis from **per-report** ACL and must not be conflated; the new `report_permissions` table (below) is deliberately a separate, parallel structure.
- `activity_logs.metadata` is `Json?` — useful for flexible per-action context, but avoid putting anything there that should be queryable/filterable (put that in a real column/index instead).
- `reports.file_*` columns model exactly one file per report; splitting into `report_files` is additive (new table) rather than destructive — keep the existing columns during migration as a deprecated "primary file" cache if useful for read performance, or drop once all call sites migrate to `report_files`. Decide explicitly rather than leaving both indefinitely.
- `reports` needs a new `output_type: PRINT_FORM | DATA_REPORT` column (see `system-design.md §3.9`) — this is what determines which `report_files.file_kind` values are valid for a given report; it is **not** related to rendering, since this system renders nothing (§3.8).
- `report_queries.sql_text` is **reference/documentation metadata only** — it records "what SQL query produced this report's data" so other reporters can check it before building something similar, exactly the anti-duplication goal from `requrisement.md`. The application **never executes** this SQL against any datasource; it is stored and displayed as read-only text. Don't let a future feature accidentally turn this into an execution surface without a deliberate, separately-reviewed design.

### 5.3 New Tables (Phase 2+)

```prisma
model report_files {
  id          String    @id
  report_id   String
  file_kind   FileKind  // BLANK_FORM | SAMPLE_FILLED_FORM (for output_type=PRINT_FORM) | SAMPLE_DATA (for output_type=DATA_REPORT)
  file_path   String    // object storage key, not a public disk path
  file_name   String
  file_type   String
  file_size   BigInt
  version     String    @default("1.0")
  is_current  Boolean   @default(true)
  uploaded_by String
  created_at  DateTime  @default(now())
  reports     reports   @relation(fields: [report_id], references: [id], onDelete: Cascade)

  @@index([report_id, file_kind])
}

// Reference/documentation only — the app never executes sql_text (see §5.2).
// Lets reporters see "what query produced this data" before building a new report from scratch.
model report_queries {
  id         String   @id
  report_id  String
  name       String
  sql_text   String
  is_main    Boolean  @default(false)
  version    String   @default("1.0")
  created_by String
  created_at DateTime @default(now())
  updated_at DateTime
  reports    reports  @relation(fields: [report_id], references: [id], onDelete: Cascade)

  @@index([report_id])
  // enforced in a migration: CREATE UNIQUE INDEX ... ON report_queries (report_id) WHERE is_main = true;
}

model report_query_versions {
  id           String   @id
  query_id     String
  version      String
  sql_text     String
  change_log   String?
  created_by   String
  created_at   DateTime @default(now())
  report_queries report_queries @relation(fields: [query_id], references: [id], onDelete: Cascade)
}

model report_variables {
  id            String   @id
  report_id     String
  name          String
  label         String?
  data_type     String   // STRING | NUMBER | DATE | BOOLEAN | ...
  default_value String?
  is_required   Boolean  @default(false)
  sort_order    Int      @default(0)
  reports       reports  @relation(fields: [report_id], references: [id], onDelete: Cascade)

  @@unique([report_id, name])
}

model report_permissions {
  id           String       @id
  report_id    String
  subject_type SubjectType  // USER | ROLE
  subject_id   String       // users.id or roles.id depending on subject_type
  can_view     Boolean      @default(false)
  can_edit     Boolean      @default(false)
  can_delete   Boolean      @default(false)
  can_favorite Boolean      @default(false)
  can_export   Boolean      @default(false)
  can_print    Boolean      @default(false)
  created_at   DateTime     @default(now())
  updated_at   DateTime
  reports      reports      @relation(fields: [report_id], references: [id], onDelete: Cascade)

  @@unique([report_id, subject_type, subject_id])
  @@index([subject_type, subject_id])
}

enum ReportOutputType {
  PRINT_FORM
  DATA_REPORT
}

enum FileKind {
  BLANK_FORM          // PRINT_FORM only
  SAMPLE_FILLED_FORM  // PRINT_FORM only
  SAMPLE_DATA         // DATA_REPORT only
}

enum SubjectType {
  USER
  ROLE
}
```

`report_permissions` is deliberately **not** FK'd directly to both `users` and `roles` simultaneously (Prisma/Postgres can't express a conditional FK cleanly) — `subject_id` is validated at the application layer against `subject_type`. Document this constraint prominently at the top of `lib/report-acl.ts`.

### 5.4 Migration Sequencing Notes

- Add new tables additively; do not touch existing columns on `reports` until all read/write call sites are migrated to `report_files`/`report_queries` (see §5.2).
- The partial unique index for "one main query per report" (`WHERE is_main = true`) must be added via a raw SQL migration step (`prisma migrate dev --create-only` then hand-edit) since Prisma's schema DSL doesn't support partial indexes directly.
- Seed scripts (`prisma/seeds/*.ts`) need corresponding new seed files for `report_files`/`report_queries`/`report_variables`/`report_permissions`, wired into `prisma/seed.ts`'s `main()` (currently most existing seed steps are commented out by default — keep that convention, don't uncomment everything by default).

### 5.5 Indexing & Query Performance

- Every new list-query-able table gets an index on its most common filter column (already the pattern: `reports` indexes `category_id/code/created_at/status`). Add `department_id` and a composite `(status, category_id)` if browse filtering by both becomes common.
- Full-text search: start with PostgreSQL native (`tsvector` generated column over `name_th || name_en || description`, GIN index) plus `pg_trgm` for fuzzy/typo-tolerant matching and `unaccent` for Thai/English mixed text. Do not introduce Meilisearch until data volume or query-latency numbers justify it (see open question in `new_requirement.md` §8.4).

---

## 6. Security Design (OWASP-aligned)

| OWASP Top 10 (2021) | Current State | Design Requirement |
|---|---|---|
| A01 Broken Access Control | Menu-level RBAC exists; per-report ACL missing; two user routes found with no auth check at all | Implement `lib/report-acl.ts` (§3.5) as the single enforcement point; audit **every** route handler against the `requireRole` pattern before Phase 2 ships; add an automated test that asserts every `app/api/**/route.ts` file imports `requireAuth`/`requireRole` unless explicitly allow-listed as public |
| A02 Cryptographic Failures | JWT via `jose`, bcrypt password hashing — sound choices | Ensure `JWT_SECRET` rotation policy documented; cookie must be `Secure` in production, `SameSite=Lax` minimum; never log tokens/passwords (audit `activity_logs.metadata` inputs) |
| A03 Injection | Prisma parametrizes queries by default; `zod` validates input shapes | **New risk surface**: `report_queries.sql_text` stores raw SQL that documents "what query produced this data" for reference/versioning (§5.3) — the application **never executes this SQL at all**; it is stored and displayed as text only, so there is no execution surface to protect against injection on this field. If a future feature ever needs to run it, that must go through a least-privilege, read-only datasource — never the app's own primary connection — but no such execution exists today |
| A04 Insecure Design | — | Per-report ACL resolution order (§3.5) is centralized and testable by design, not scattered per-endpoint |
| A05 Security Misconfiguration | No CSP/HSTS headers configured today | Add security headers via `next.config.js` (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`); disable stack traces in production error responses |
| A06 Vulnerable Components | No dependency scanning currently | Add `npm audit`/Dependabot (or Renovate) to CI |
| A07 Identification & Auth Failures | Basic rate limiting (in-memory today, Redis in Phase 0); no 2FA active despite schema columns existing | Redis-backed rate limit (fail-open, defense-in-depth); 2FA via `otplib` as a **Could** (Phase 4); enforce password complexity + `password_changed_at` policy if compliance requires |
| A08 Software/Data Integrity Failures | File uploads accepted without malware scanning | ClamAV sidecar scan before object storage write (Phase 4); verify uploaded PDF/Excel MIME/magic-bytes match declared `file_type` and the allowed kinds for the report's `output_type`, don't trust the client-declared MIME alone |
| A09 Logging & Monitoring Failures | No structured logging, no `activity_logs` writes anywhere today | `logActivity()` on every mutation (Phase 0); `pino` structured logs + Sentry error tracking (Phase 4); alert on repeated 401/403/429 bursts (possible credential stuffing) |
| A10 Server-Side Request Forgery | Not currently applicable (no server-initiated outbound requests to user-supplied URLs) | Revisit if/when `report_shares` link previews or webhook-style notifications are added — validate/allow-list any user-supplied URL before the server fetches it |

Additional hardening not mapped to a specific OWASP category but relevant to this system's shape:

- **File upload validation**: enforce an explicit allow-list of extensions/MIME types per `file_kind` (`BLANK_FORM`/`SAMPLE_FILLED_FORM` → `.pdf` only; `SAMPLE_DATA` → `.xlsx`/`.xls` only), max size per kind, and sanitize filenames (strip path separators, control characters) before constructing any storage key.
- **CSRF**: JSON API routes reading a `Bearer`/cookie-based session are relatively low CSRF risk if `SameSite=Lax` is enforced, but any future form that submits via traditional `multipart/form-data` POST from a browser should still carry a CSRF token or rely on `SameSite` strictly — decide explicitly rather than assuming cookie `SameSite` alone is sufficient once external integrations (§8) are added.
- **Secrets**: `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, future SMTP/S3 credentials — never committed; `.env.local` git-ignored (already the convention per `CLAUDE.md`); production secrets sourced from the deployment platform's secret store, not baked into images.

---

## 7. Infrastructure & Deployment Design

### 7.1 Deployment Topology (Docker Compose baseline)

```
services:
  app          # Next.js (build + start), port 3501
  postgres     # PostgreSQL 16+
  redis        # rate-limit, cache, BullMQ broker
  minio        # S3-compatible object storage (or point at real S3 in cloud deployments)
  clamav       # (Phase 4) AV scan sidecar
  worker       # (Phase 3+) BullMQ worker process, same image as `app`, different entrypoint/command
```

- On-prem/VM deployment is the default target given internal-tool constraints (local file writes today, likely internal SMTP, possible LDAP/SSO). If a cloud/serverless deployment (e.g. Vercel) is chosen instead, **local disk file storage must be migrated to real S3 first** — serverless function instances have no persistent local filesystem across invocations.
- `app` and `worker` scale horizontally once Redis-backed rate limiting and object storage removes the two remaining pieces of instance-local state.

### 7.2 CI/CD

- GitHub Actions pipeline: `lint` (`next lint`) → `typecheck` (`tsc --noEmit`) → `build` (`next build`) → `prisma migrate diff` (fail the build on undeclared schema drift between `schema.prisma` and the target migration history) → (once tests exist) `vitest`/`playwright`.
- No automated tests exist today — see §7.4 non-functional testing plan; do not let CI green-light on build success alone once real business logic (per-report ACL, versioning) exists, since those are exactly the kind of logic regressions that silently break without tests.

### 7.3 Observability

- Replace scattered `console.log`/`console.error` with **pino** structured logging (request id, user id, route, latency) at the route-handler boundary.
- **Sentry** (or self-hosted GlitchTip if on-prem-only is a hard requirement) for exception tracking, with source maps uploaded on build.
- Health check endpoint (`GET /api/health`) checking DB + Redis + object storage connectivity, for container orchestration liveness/readiness probes.

### 7.4 Testing Strategy

| Layer | Tool | Priority target |
|---|---|---|
| Unit (lib/ functions) | Vitest | `lib/report-acl.ts` permission resolution (highest priority — security-critical logic), `lib/auth.ts` rate limiter, `lib/pagination.ts` |
| Component | React Testing Library | Forms with `zod` validation, `SharedDataTable` pagination/sort |
| API/integration | Vitest + a test Postgres schema (or `testcontainers`) | Every route handler's auth-gate behavior (401/403 paths), report ACL filtering on list endpoints |
| E2E | Playwright | Login → search → preview → download flow; admin create-report → set permissions → verify a restricted user cannot see it |

---

## 8. Extensibility for Future Integrations

Per the user's stated concern about future growth and external API integration, the design keeps these seams explicit:

- **AuthProvider interface** (§3.3) — new identity sources (LDAP/SSO/external API) plug in without touching route handlers or the JWT/cookie session model downstream of login.
- **Preview/render abstraction** — PDF and Excel handling is isolated behind `lib/preview.ts` (parses `SAMPLE_DATA` Excel → rows/columns) and the signed-URL download proxy, not scattered inline in route handlers. If a future requirement ever needs true dynamic report generation (e.g. a rendering engine producing a PDF from live data), it can be added behind this same boundary as a new, independent service — without this system needing to touch it today, since no such rendering exists in the current design.
- **Object storage abstraction** — code should call a thin `lib/storage.ts` wrapper (`putObject`, `getSignedUrl`, `deleteObject`) rather than importing an S3/MinIO SDK directly in route handlers, so the backing provider (MinIO on-prem vs. S3 in cloud vs. Azure Blob) is swappable via configuration.
- **Notification producer/consumer split** — `notifications` table is the contract; email delivery, in-app bell, and any future webhook/Slack integration are independent consumers of the same producer calls (`lib/notify.ts`), so adding a new channel never requires touching the code that decides *when* to notify.
- **Settings-driven configuration** — the existing `settings` key/value table is the intended place for anything that should be admin-configurable without a deploy (auth provider choice, storage backend, feature flags), avoiding hardcoded `if` branches spread across the codebase as the system grows.
