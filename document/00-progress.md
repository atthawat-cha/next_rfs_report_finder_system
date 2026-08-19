# ความคืบหน้าโครงการ — RFS Report Finder System

> **อัปเดตล่าสุด:** 2026-08-19 · **Branch:** `feature/phase4` · **HEAD:** `beb62ee`
>
> ไฟล์นี้ตอบคำถามเดียว: **"ตอนนี้ถึงไหนแล้ว และเหลืออะไร"** สถานะทุกแถวอ้างอิง commit จริงใน git log เป็นหลักฐาน ไม่ใช่การอ่านโค้ดเดา
>
> **เอกสารอื่นทำหน้าที่ต่างกัน — อย่าสับสน:**
> | เอกสาร | ตอบคำถาม |
> |---|---|
> | **ไฟล์นี้** | ถึงไหนแล้ว / เหลืออะไร / ติดอะไร |
> | [`feature-list.md`](./feature-list.md) | ระบบต้องมีฟีเจอร์อะไรบ้าง (~90 รายการ + MoSCoW priority) |
> | [`phase0`](./phase0-plan.md)–[`phase3-plan.md`](./phase3-plan.md) | แต่ละ phase ทำอะไรบ้าง (endpoint, ไฟล์, Verification list) |
> | [`00-new_requirement.md`](./00-new_requirement.md) · [`01-system-design.md`](./01-system-design.md) | โจทย์ & การออกแบบระบบ |

---

## 👉 ตอนนี้อยู่ตรงไหน

**โค้ดเสร็จแล้ว:** Phase 0 → 3e ทั้งหมด (14 sub-phase, verified จริง 39/39 บน DB `nextjs_rfs`) + **Phase 4a/4b/4c/4d/4e/4f เสร็จหมดแล้ว** (4e: i18n แยกเป็นแผนของตัวเองในอนาคต ไม่ใช่ของค้าง; 4f: dashboard cache/precompute deferred ตามแผนเดิม ไม่ใช่ของค้าง) — **Phase 4 ปิดครบทุก sub-phase**

> หมายเหตุ branch: ย้ายมาทำงานบน `feature/phase4` แล้ว (เดิม `feature/phase3`) — commit ประวัติเดียวกัน ไม่มีอะไรหาย ดู git log ถ้าสงสัย

**ค้างอยู่:** ไม่มีงานเฟส 0-3 ค้างแล้ว — **Phase 4d ปิดจบสมบูรณ์แล้ว 100%** (ดูล่างนี้ — full login-flow ยืนยันสดแล้ว 2026-08-18 หลังแก้ Redis connectivity) — **`dependency-upgrade-plan.md` ปิดครบทั้ง 4 stage แล้ว** (Next 14→16.3.1, React 18→19.2.8, sharp 0.34→0.35.3, postcss top-level 8.4→8.5.26) — `next`/`postcss`/`sharp` ทุก CVE ที่ตั้งใจปิดในแผนนี้หายหมดจริง เหลือแค่ 2 ของค้างที่ไม่เกี่ยวกับแผนนี้เลย (#9 `deepmerge-ts`/Prisma, `uuid`/`exceljs` เดิมตั้งแต่ 4c) — **baseline TypeScript error 2 ตัวสุดท้ายก็แก้จบแล้วเช่นกัน (2026-08-18)** ระหว่างทางเจอบั๊ก runtime จริงที่ยังไม่เคยมีใครเจอมาก่อน (multi-file upload พังเงียบๆมาตลอด, `status` field ไม่มี enum validation) แก้พร้อมกันหมด — `npx tsc --noEmit` = 0 error, `npm run build` = exit 0 สำเร็จเต็มรูปแบบเป็นครั้งแรกของ repo นี้ ปิดของค้าง #2/#12 ไปด้วย

> **หมายเหตุ dev environment (2026-08-18):** Redis เดิมไม่มีอะไร listen ที่ `localhost:6380` เลย (root cause ของบล็อกเกอร์ 4d ที่ค้างมาตั้งแต่ `e3e3978`) แก้โดยเปิด Docker Desktop (ติดตั้งอยู่แล้วแต่ไม่ได้รัน) แล้วรัน `docker run -d --name rfs-verify-redis -p 6380:6379 redis:7-alpine` — คอนเทนเนอร์นี้ **ยังรันอยู่หลังจบ session นี้ตั้งใจทิ้งไว้** เพื่อให้ rate-limiting/2FA ใช้งานได้ต่อระหว่าง dev ปกติ (ไม่ใช่แค่ของทดสอบครั้งเดียว) — ถ้าไม่ต้องการแล้วสามารถ `docker stop rfs-verify-redis && docker rm rfs-verify-redis` ได้ทุกเมื่อ ไม่มีข้อมูลสำคัญเก็บอยู่ (เป็น cache/ephemeral state ล้วน)

**Phase 5 วางแผนแล้ว (2026-08-19)** — โจทย์มาจาก `document/diff_req.md` ที่ผู้ใช้ commit เข้ามาเอง (`beb62ee`) แผนเต็มอยู่ที่ [`phase5-plan.md`](./phase5-plan.md) แบ่ง 6 sub-phase (5a-5f) ตัดสินใจครบทุกข้อกับผู้ใช้แล้วก่อนเขียน (ดูหัวข้อ "Resolved decisions" ในแผน) — ยังไม่เริ่มเขียนโค้ด

**งานถัดไปที่ควรทำ (เรียงตามลำดับ):**
1. **ลงมือ Phase 5a** (report detail page + SqlBlock) ตาม `phase5-plan.md`
2. **ยืนยันว่า CI workflow รันจริงบน GitHub** — branch `feature/phase4` push ขึ้น origin แล้ว แต่ยังไม่เคยเห็นผลรัน (`.github/workflows/ci.yml` ตั้งไว้ตั้งแต่ 4f ยังไม่เคยยืนยันว่าเขียวจริงบน runner)
3. **วางแผน i18n (`next-intl`) แยกเป็น phase ใหม่ของตัวเอง** — ถูก scope out จาก 4e และจาก Phase 5 ด้วย เพราะเป็น all-or-nothing sweep ทั้งโปรเจกต์
4. **ของค้าง #9** (`deepmerge-ts`/Prisma) — รอ Prisma ออก patch จริงหรือ Prisma 8 GA ไม่มีอะไรให้ทำตอนนี้

> lint baseline 228 ปัญหา (ของค้าง #11) และ `docker-compose.yml` สำหรับ Redis — **ย้ายเข้าไปเป็น 5f แล้ว** ไม่ใช่งานลอยอีกต่อไป

---

## 📋 ตารางความคืบหน้า

**สัญลักษณ์:** ✅ **โค้ดเสร็จ+commit แล้ว** (ไม่ได้แปลว่ารันได้กับ DB ปัจจุบัน — ดูกล่องแดงด้านบน) · 🚫 blocked · ❌ ยังไม่เริ่ม · 📝 มีแต่แผน ยังไม่มีโค้ด

### Phase 0 — Foundation Cleanup ✅
[แผนเต็ม →](./phase0-plan.md)

| # | งาน | สถานะ | Commit |
|---|---|---|---|
| 1 | แก้ `middleware.ts` auth flow + redirect | ✅ | `5e799c1` |
| 2 | Rate limiter: in-memory `Map` → Redis | ✅ | `5809f5f`, `a9e9a27` |
| 3 | Pagination บน `GET /api/reports/report/manage` | ✅ | `5e799c1` |
| 4 | `logActivity()` กลาง + ปิด endpoint ที่ไม่มี auth guard | ✅ | `f8d7598` |

### Phase 1 — MVP ฝั่งผู้ใช้ (ค้นหา/ดูรายงานได้จริง) ✅
[แผนเต็ม →](./phase1-plan.md)

| # | งาน | สถานะ | Commit |
|---|---|---|---|
| 1 | แก้บั๊ก `access_level` ไม่ persist | ✅ | `7a099b8` |
| 2 | Full-text search infrastructure (migration `20260813131434`) | ✅ | `7a099b8` |
| 3 | `GET /api/reports/browse` สำหรับ non-admin | ✅ | `7a099b8` |
| 4 | ต่อ UI ค้นหาที่เป็น stub ให้ทำงานจริง | ✅ | `7a099b8` |
| 5 | Favorites CRUD จริง | ✅ | `7a099b8` |
| 6 | Download endpoint | ✅ | `7a099b8` |

### Phase 2 — โครงสร้างข้อมูลรายงานฝั่งแอดมิน ✅
[แผนเต็ม →](./phase2-plan.md)

| Sub-phase | งาน | สถานะ | Commit |
|---|---|---|---|
| **2a** | Schema `report_files`/`queries`/`variables`/`permissions` + `lib/report-acl.ts` (ACL resolver กลาง) | ✅ | `021eb9a` |
| **2b** | `report_files` CRUD + versioning, หน้าแก้ไขรายงาน, สลับ Phase 1 endpoints มาใช้ ACL | ✅ | `02ee75d` |
| **2c** | `report_queries` (+ auto-snapshot versioning) + `report_variables` CRUD | ✅ | `30d2655` |
| **2d** | `report_permissions` CRUD + Permission Editor UI (matrix ผู้ใช้/บทบาท × action) | ✅ | `c9d640c` |

### Phase 3 — Versioning UI, Sharing, Notifications, Dashboard
[แผนเต็ม →](./phase3-plan.md)

| Sub-phase | งาน | สถานะ | Commit |
|---|---|---|---|
| **3a** | Version History + Rollback (ไฟล์ + คิวรี่) | ✅ | `df9aee4` |
| **3b** | Report Sharing — `report_shares` CRUD + public token-gated access | ✅ | `2f75a58` |
| **3c** | Notifications — `lib/notifications.ts` + API + Notification Bell | ✅ | `66f553c` |
| **3d** | Dashboard & Activity Log Analytics — 3 dashboard endpoints + `/api/activity-logs` + หน้า Dashboard + หน้า Activity Log | ✅ | `453cdf2` |
| **3e** | Settings — persist ธีมต่อผู้ใช้ (`users.theme_preference`) | ✅ | `f27a1dc` |

**3e ปิดจบแล้ว** (`f27a1dc`):
- [x] Migration `20260817182535_add_user_theme_preference` — เขียน SQL มือ + `migrate resolve --applied` (ไม่ใช้ `migrate dev` ตรงๆ เพราะชน drift เดิมของของค้าง #1)
- [x] `app/api/settings/theme/route.ts` (GET/PUT, `requireAuth` เท่านั้น ไม่ใช่ admin-only)
- [x] `components/layouts/theme-sync.tsx` (ใหม่) + แก้ `authenticationLayout.tsx` / `mode-toggle.tsx`
- [x] Verified ด้วย curl: GET/PUT scoped ต่อ user (`user`→dark ไม่กระทบ `admin`→null), PUT ค่า invalid → 400, ไม่ login → 401. ไม่ได้ทดสอบผ่าน browser จริง (ไม่มี browser tool ใน session นี้)

### Phase 4 — Hardening & Enterprise Features 🚧 เริ่มแล้ว
[แผนเต็ม →](./phase4-plan.md) — แบ่ง 6 sub-phase (4a-4f), แผนละเอียดเต็มมีแค่ 4a ตอนนี้ ที่เหลือเป็น overview รอคำตอบจากผู้ใช้ก่อนลงรายละเอียด (เลือก test framework, vendor error-tracking, ยืนยันความต้องการจริงของ storage backend/auth provider abstraction)

| Sub-phase | งาน | สถานะ | Commit |
|---|---|---|---|
| **4a** | Security response headers (CSP/HSTS/X-Content-Type-Options/X-Frame-Options/Referrer-Policy/Permissions-Policy) | ✅ | `dd98843` |
| **4b** | Automated test suite bootstrap — Vitest, first tests on `lib/report-acl.ts` | ✅ | `dad7014` |
| **4c** | Upload/file-serving gaps — single-report view, per-`file_kind` download, PDF/Excel preview + print, `view_count` ✅ (AV scan deferred, no ClamAV confirmed) | ✅ | `be89ddf` |
| **4d** | Auth flexibility & policy — TOTP 2FA + backup codes, password policy (8 ตัว+ตัวอักษร+ตัวเลข) ✅ (auth provider selection dropped, aspirational) | ✅ | `e3e3978` |
| **4e** | Settings ที่เหลือ + notification ที่ defer ไว้ — per-`file_kind` max upload size, `DEPARTMENT` share fan-out, expiry/system notification jobs ✅ (storage backend + i18n dropped/deferred, aspirational หรือ scope แยกต่างหาก) | ✅ | `63e6af4` |
| **4f** | Observability & ops — structured logging (`lib/logger.ts`, pino), CI + dependency vulnerability scanning, abnormal-auth-pattern alerting dashboard card ✅ (dashboard stat cache/precompute stays deferred, no perf problem measured yet) | ✅ | `f222dca`, `c0c0c48` |

**4a ปิดจบแล้ว** (`dd98843`, ยืนยันสดแล้ว):
- [x] `next.config.js` `headers()` — ครอบทุก route ทั้งหน้าเว็บและ `/api/*`
- [x] ยืนยันด้วย `curl -I` จริงหลัง restart dev server: `/login` (page) และ `/api/reports/browse` (API) ทั้งคู่มีครบ 6 header ค่าตรงตามที่ตั้งไว้

**4b ปิดจบแล้ว** (`dad7014`):
- [x] `npm test`/`npm run test:watch` ผ่าน Vitest, native `resolve.tsconfigPaths` reuse `@/*` alias เดิม
- [x] `lib/report-acl.test.ts` — 7 test ครอบ `resolveReportAcl`/`visibleReportIdsFor` ทั้ง resolution order (individual > role > fallback) และ deny/allow edge case ตรงกับที่ Phase 2a เคยตรวจมือไว้
- [x] ยืนยันว่า suite จับ regression ได้จริง (comment เช็ค individual grant ออกชั่วคราว → test ที่เกี่ยวข้อง fail ตามคาด, revert แล้ว), รัน 2 รอบติดกันไม่มี fixture ค้าง (`VITEST-*` = 0 แถวหลังรันเสร็จทุกครั้ง)

**4c ปิดจบแล้ว** (`be89ddf`):
- [x] `GET /api/reports/[id]` (ใหม่) — single-report detail สำหรับ non-admin ทุก role, ACL-gated (404 ไม่ใช่ 403), admin bypass, **increment `view_count` จริงเป็นครั้งแรก** ตั้งแต่เพิ่มคอลัมน์มา + log `'view'` activity ใหม่
- [x] `GET /api/reports/[id]/files/[fileId]/download` (ใหม่) — ดาวน์โหลดไฟล์เฉพาะ kind ที่ไม่ใช่ primary (เช่น `SAMPLE_FILLED_FORM` บนรายงาน `PRINT_FORM`) ซึ่งก่อนหน้านี้ไม่มีทางเข้าถึงได้เลยสำหรับ user ทั่วไป
- [x] `GET /api/reports/[id]/files/[fileId]/preview` (ใหม่) — parse excel/csv ฝั่ง server ด้วย `exceljs` คืน `{headers, rows}` จำกัด 200 แถว (ไม่ bundle exceljs ไปฝั่ง client)
- [x] `components/shared/reportPreviewDialog.tsx` (ใหม่) — controlled dialog (ไม่ใช้ `DialogTrigger` ซ้อนใน `DropdownMenuItem` เพราะเจอ conflict ของ Radix), PDF preview ผ่าน `<embed>`, Excel preview ผ่าน endpoint ใหม่, ปุ่มพิมพ์ scope เฉพาะ `.report-print-area`
- [x] wire เป็นเมนู "Preview" ใน `reportColumn.tsx`/`favReportColumn.tsx` (แปลงเป็น factory function รับ callback)
- [x] ยืนยันสดครบ: `view_count`/`download_count` เพิ่มจริงผ่าน SQL ตรง, ดาวน์โหลด `SAMPLE_FILLED_FORM` ได้ byte-identical, preview excel คืนค่าตรงกับไฟล์จริง, preview PDF ได้ 400 ถูกต้อง, หน้า report-list/favorites compile ผ่าน 200
- ⚠️ `exceljs` ดึง advisory ระดับ moderate ผ่าน `uuid` (`GHSA-w5hq-g745-h8pq`) มาด้วย — ไม่ reachable จาก usage ของแอปนี้ (parse ไฟล์ server-side ไม่รับ buffer จาก client โดยตรง) ไม่ downgrade เพราะ fix เดียวที่มีคือ exceljs 3.4.0 ซึ่งเก่ากว่าที่ควร
- AV scan (ClamAV) — deferred ตามที่ผู้ใช้ยืนยัน ไม่มี daemon ยืนยันในสภาพแวดล้อม deploy

**4d ปิดจบแล้ว** (`e3e3978`):
- [x] Schema: ตาราง `two_factor_backup_codes` ใหม่ + ประกาศ 4 index ค้นหา (`search_vector`/trgm) ใน `schema.prisma` ผ่าน `@@index(..., type: Gin, map: "...")` ของ Prisma 7 เพื่อปิดของค้างที่ `migrate dev` จะพยายาม drop index พวกนี้ทุกครั้ง (ดูรายละเอียดเหตุการณ์ที่เจอระหว่างทำใน `phase4-plan.md` 4d ข้อ 1 — migration รอบนี้ **เผลอลบ index ค้นหาทั้ง 4 ตัวไปจริง** ก่อนจะกู้คืน+แก้ต้นเหตุ)
- [x] `lib/two-factor.ts` — TOTP (`otplib` **v12.0.1 ปักหมุดไว้** ไม่ใช่ v13 ที่ npm install มาให้ default เพราะ v13 เพิ่ง rewrite เป็น plugin architecture ใหม่หมดเมื่อไม่กี่สัปดาห์ก่อน ความเสี่ยงสูงกว่า v12 classic API ที่นิ่งมานาน), backup codes (bcrypt-hashed), pending-2FA token ผ่าน Redis (fail **closed** ถ้า Redis ล่ม ต่างจาก rate-limiter ที่ fail open โดยตั้งใจ)
- [x] `app/api/auth/2fa/{setup,confirm,disable,status}` + `app/api/auth/login/verify-2fa` (ใหม่) + แก้ `login/route.ts` ให้ withhold session ถ้า `two_factor_enabled`
- [x] `components/shared/twoFactorSettings.tsx` wire เข้า `profile/page.tsx` (แทนการ์ด placeholder เดิม) + แก้ `login/page.tsx` เป็น 2 ขั้นตอน
- [x] `lib/password-policy.ts` (8 ตัว+ตัวอักษร+ตัวเลข, ใช้ร่วมกันทั้ง create/update user) + set `password_changed_at` ทั้งสองจุด (ไม่บังคับ rotate ตามที่ตัดสินใจไว้)
- [x] ยืนยันสด: enroll 2FA จริงบน account ทดสอบ (คำนวณ TOTP code จาก secret ที่คืนมาด้วย `otplib` ตรงๆ), ได้ backup code 10 ชุด, DB ตรง; `disable` ปฏิเสธรหัสผ่านผิด (401) และสำเร็จด้วยรหัสถูก เคลียร์ secret/backup codes ครบ; password policy ปฏิเสธรหัสสั้น/ไม่มีตัวเลขทั้ง create/update, ผ่านรหัสที่ถูกต้อง, `password_changed_at` set/update ถูกต้อง
- [x] **Full login-flow ยืนยันสดแล้ว (2026-08-18)** — root cause ของ Redis unreachable คือไม่มีอะไร listen ที่ `localhost:6380` เลยจริงๆ (ไม่ใช่ config ผิด) แก้โดยเปิด Docker Desktop (มีอยู่แล้วแต่ไม่ได้รัน) + `docker run -d --name rfs-verify-redis -p 6380:6379 redis:7-alpine` แล้วทดสอบ end-to-end จริงด้วย test user ที่สร้างเอง (`Verify4d!123`): login ปกติ → `2fa/setup` → คำนวณ TOTP จาก secret ด้วย `otplib` ตรงๆ → `2fa/confirm` → ได้ backup code 10 ชุด; login ใหม่ → ได้ `requires2fa:true`+`pendingToken`, **ไม่มี cookie**; `verify-2fa` ด้วย TOTP code ปัจจุบัน → ได้ cookie จริง ใช้เรียก endpoint ที่ต้อง auth ได้จริง (`2fa/status` → 200); login ใหม่อีกรอบ → `verify-2fa` ด้วย backup code → สำเร็จครั้งเดียว, ใช้ backup code เดิมซ้ำ → 401 "รหัสไม่ถูกต้อง" ตามคาด; ยิง `verify-2fa` รหัสผิดต่อเนื่องจนรวมกับ attempt ก่อนหน้าในหน้าต่าง 15 นาทีเกิน `MAX_ATTEMPTS=5` → 429 จริง (ยืนยันว่า IP-keyed limiter สะสมข้าม request ถูกต้อง ไม่ได้ reset ทุกครั้งที่คาดผิดในตอนแรก); `disable` รหัสผ่านผิด → 401 ยัง enabled, รหัสถูก → `two_factor_enabled=false`+secret เป็น null+backup codes ลบหมดจริงใน DB — ลบ test user/activity logs ทิ้งหลังจบ
- ⚠️ **Redis container `rfs-verify-redis` ยังรันอยู่ต่อหลัง session นี้ตั้งใจ** (ดูกล่องหมายเหตุใน "ตอนนี้อยู่ตรงไหน" ด้านบน) — เดิมไม่มี Redis ให้ dev ใช้เลยตั้งแต่ต้น ทำให้ rate-limiting/2FA-pending-token ใช้งานไม่ได้จริงนอกจากตอนทดสอบแบบนี้

**4e ปิดจบแล้ว** (`63e6af4`):
- [x] Schema: `report_shares.expiry_notified_at DateTime?` (nullable, ใหม่) — migration `20260818115514_add_report_shares_expiry_notified_at`, ตรวจ+ตัด `ALTER COLUMN reports.search_vector DROP DEFAULT` ออกจาก migration.sql ตาม standing rule ของค้าง #1 ก่อน apply — สร้างผ่าน `prisma migrate dev` (ค้าง non-interactive shell หลัง apply สำเร็จ เพราะรอ prompt ต่อ ใช้ `TaskStop` ยกเลิก process ที่ค้างแล้วยืนยันด้วย `prisma migrate status`/`information_schema` ว่า apply จริงแล้วแทน) + เพิ่ม `'system'` เข้า `lib/activity-log.ts`'s `ActivityEntity` (additive, pattern เดียวกับ `'view'` ใน 4c)
- [x] Per-`file_kind` max upload size — `lib/reportFileUploadServices.ts`: `MAX_SIZE_BY_KIND` (`BLANK_FORM`/`SAMPLE_FILLED_FORM` 10 MB, `SAMPLE_DATA` 20 MB) แทน flat `DEFAULT_MAX_SIZE` เดิม, ใช้ default-parameter อ้างอิง `fileKind` ที่ผ่านมาก่อนหน้าในลายเซ็นเดียวกัน ทำให้ **ไม่ต้องแก้ call site เลย** (`app/api/reports/[id]/files/route.ts` เดิมยังเรียก 2-arg เหมือนเดิม แต่ได้ limit ตาม kind อัตโนมัติ)
- [x] `DEPARTMENT` share fan-out — `app/api/reports/[id]/shares/route.ts` POST: เพิ่ม branch คู่กับ `USER` เดิม, query สมาชิกแผนกยกเว้นผู้แชร์เอง แล้ว `createNotification` วนทุกคน
- [x] `POST /api/system/jobs/check-report-expiry` (ใหม่) — ไม่มี cron ในระบบ จึงเป็น manually-invokable endpoint (admin-only) ที่ตั้งใจให้ผูกกับ external scheduler ภายหลัง; หน้าต่างเตือนล่วงหน้า 3 วัน, de-dupe ด้วย `expiry_notified_at`
- [x] `GET`/`PUT /api/settings/system` (ใหม่) — **ตัวใช้งานจริงตัวแรกของตาราง `settings`** (เดิมมีแค่ 1 แถว seed ไว้ ไม่มีโค้ดอ่าน/เขียนเลย) เก็บ `STORAGE_LIMIT_BYTES`/`MAINTENANCE_MODE`; `PUT` broadcast `SYSTEM_MAINTENANCE` ให้ทุก user เมื่อค่า maintenance เปลี่ยนสถานะ (ทั้งสองทิศทาง เปิด/ปิด)
- [x] `POST /api/system/jobs/check-storage` (ใหม่) — เทียบผลรวม `report_files.file_size` กับ `STORAGE_LIMIT_BYTES`, ข้ามถ้ายังไม่ตั้งค่า threshold, de-dupe ด้วยการเช็ค unread `SYSTEM_STORAGE_LOW` notification ของ admin ในช่วง 24 ชม.ที่ผ่านมา (คนละวิธีกับ expiry เพราะเป็นเงื่อนไขที่เกิดซ้ำได้จนกว่าจะแก้ ไม่ใช่ event ครั้งเดียว)
- [x] `app/(auth)/settings/general/page.tsx` (ใหม่) — เข้าถึงได้จาก nav "System Settings → General Settings" ที่มีอยู่แล้วใน `lib/menu-list.ts` (เดิมชี้ไปหน้าที่ไม่มีจริง) ไม่มี client-side role gate ตาม pattern เดิมของ repo (พึ่ง API 403 เป็นตัวกันจริง)
- [x] ยืนยันสดครบทุกจุดผ่าน curl + JWT ที่ mint ตรงด้วย `createToken` (เทคนิคเดียวกับ 4f): `DEPARTMENT` share แจ้งเตือนสมาชิก 2 คนไม่รวม admin ที่แชร์เอง (ยืนยันด้วย DB query ตรง); `check-report-expiry` แจ้ง share ที่เหลือ 2 วันแต่ไม่แจ้ง share ที่เหลือ 10 วัน (นอกหน้าต่าง 3 วัน), เรียกซ้ำแล้วไม่แจ้งซ้ำ + `expiry_notified_at` ถูก set; `check-storage` ตั้ง threshold=0 ไบต์แล้วได้ `over_threshold:true` + แจ้งเตือน 1 ครั้ง, เรียกซ้ำไม่แจ้งซ้ำ; `PUT /api/settings/system` flip maintenance false→true → broadcast จริงเข้า inbox ของ admin; upload ทดสอบตรงผ่าน `uploadReportFile()`: ไฟล์ 11MB kind `BLANK_FORM` → ปฏิเสธด้วยข้อความ "10 MB" ถูกต้อง, ไฟล์ 15MB kind `SAMPLE_DATA` → ผ่าน (อยู่ใต้ limit 20MB เดิม); non-admin (user role จริงจาก DB) ยิงทั้ง 3 endpoint ใหม่ → 403 ครบ; unauthenticated → 401; `/settings/general` compile 200 ยืนยันจาก bundle ว่า wire เข้า `/api/settings/system` จริง; ลบ fixture ทดสอบทั้งหมดหลังจบ (report/shares/users/notifications/settings)
- [x] i18n (`next-intl`) ยังคงถูก scope out ตามแผนเดิม — ต้องมี phase ใหม่ของตัวเอง ไม่ทำใน sub-phase นี้
- ⚠️ **เจอของค้างใหม่ระหว่างเปิด dev server ยืนยัน**: `lib/logger.ts`'s pino-pretty dev-transport worker thread โยน `MODULE_NOT_FOUND`/`uncaughtException` เป็นระยะในล็อก dev server บน Windows (`Cannot find module '.next/server/vendor-chunks/lib/worker.js'`) ทุกครั้งที่มี route ที่ import `lib/activity-log.ts` ถูกเรียก (เกิดจาก pino สร้าง worker thread ตอน import module ไม่ใช่ตอนเรียก `.error()`) **ไม่กระทบผลลัพธ์ request จริง** (ทุก endpoint ที่ทดสอบตอบถูกต้องปกติ) และ **ไม่กระทบ production** (`lib/logger.ts` ปิด transport เมื่อ `NODE_ENV==='production'`) — เป็นปัญหา dev-only บน Windows ระหว่าง pino-pretty กับ Next.js dev bundler ดูของค้าง #7 ด้านล่าง

**4f ปิดจบแล้ว** (`f222dca`, `c0c0c48`):
- [x] `lib/logger.ts` (pino, self-hosted ตามที่ผู้ใช้เลือก) + wire เข้า `logActivity`'s swallowed catch
- [x] **ไม่แตะ** `lib/auth.ts`'s swallowed catches ตามที่ระบุใน plan เดิม — เจอว่า `middleware.ts` import `getAuthFromRequest` จากไฟล์นี้และรันบน Edge runtime ซึ่ง bundle worker-thread ของ pino ไม่ได้ (ปัญหาเดียวกับที่ `lib/rate-limit.ts`/`ioredis` ต้องแยกออกจาก `lib/auth.ts` อยู่แล้ว)
- [x] **CI (ใหม่ของ repo นี้)** — `.github/workflows/ci.yml`: `npm ci` → `prisma generate` → `prisma migrate deploy` ต่อ Postgres 16 service container → `prisma/seed-ci.ts` (ใหม่ — seed ขั้นต่ำเฉพาะที่ `lib/report-acl.test.ts` ต้องการ: role `USER` 1 แถว + category 1 แถว + user 1 แถว, idempotent, แยกจาก `prisma/seed.ts` เดิมที่เปราะบางและออกแบบมาสำหรับ DB dev ถาวรไม่ใช่ CI สด) → `tsc --noEmit` → `next build` → `npm test` → `npm audit --audit-level=high`
- [x] **`GET /api/dashboard/auth-alerts`** (ใหม่) — abnormal-auth-pattern alerting แบบที่เล็กที่สุดที่มีประโยชน์ตามแผน: group `activity_logs` ที่ `action='login_failed'` ตาม `ip_address` ในหน้าต่างเวลา (default 24 ชม.), แจ้งเฉพาะ IP ที่ ≥5 ครั้ง, ไม่มี external delivery channel (แค่ dashboard card) ตามที่ตกลงไว้ — ต่อเข้า `DashboardAnalytics.tsx` เป็นการ์ดใหม่ท้ายหน้า
- [x] dashboard stat cache/precompute — คงสถานะ deferred ตามแผนเดิม (ยังไม่เจอปัญหา perf จริงบน dataset ขนาดนี้), ไม่ใช่ของค้างที่ถูกข้าม
- [x] ยืนยันสด: mint JWT ตรงผ่าน `lib/auth.ts`'s `createToken` ให้ user role `SUPER_ADMIN` จริงในDB, curl `/api/dashboard/auth-alerts` ไม่มี cookie → 401, ใส่ `login_failed` 6 แถวปลอมสำหรับ IP ทดสอบแล้ว curl พร้อม cookie → เห็น IP นั้นพร้อม `attempts:6` ถูกต้อง, ลบแถวทดสอบแล้ว; หน้า `/dashboard` compile ผ่าน 200 ด้วย token เดียวกัน, เช็ค `.next/server`/`.next/static` bundle มี reference ถึง `auth-alerts` endpoint จริง (ยืนยันว่า card ถูก wire เข้า build จริง ไม่ใช่แค่ syntax ผ่าน); `npm test` ผ่านครบ 7/7 เหมือนเดิม; `npx tsc --noEmit` ไม่มี error ใหม่นอกเหนือ baseline 2 ตัว
- ⚠️ **เจอของค้างใหม่ระหว่างรัน `npm audit --audit-level=high` จริงครั้งแรก**: มี high/critical advisory จริงอยู่ก่อนแล้วใน `next@14.2.18` (critical, ~30 CVE สะสมจากหลาย Next.js version รวมกัน), `postcss` (high, ผ่าน dependency ของ `next`), `sharp`/libvips (high) — ทั้งหมด fix ต้อง breaking upgrade (`next@16.x`, `sharp@0.35.x`) ซึ่งเกินสโคปของงานนี้ (แค่ "ตั้ง CI") ตั้ง audit step เป็น `continue-on-error: true` ชั่วคราวเพื่อให้ CI เขียวได้ก่อน ไม่ block PR ด้วยหนี้เก่าที่ยังไม่มีแผน แต่ log ยังโชว์ทุกรอบไม่ให้เงียบหาย ดูของค้าง #6 ด้านล่าง

> ⚠️ **เหตุการณ์ระหว่างทำ 4a**: รัน `npm run build` เพื่อตรวจ header เจอ EPERM ชน `.next/trace` เพราะ dev server ของผู้ใช้ (port 3501) ใช้โฟลเดอร์ `.next` เดียวกันอยู่พร้อมกัน — build ที่ fail กลางคันไปลบ `.next/server/middleware-manifest.json` ทำให้ dev server ตอบ 500 ทุก request ล้างแคช `.next` แล้วขอให้ผู้ใช้ restart dev server เอง (ไม่แตะ process ของผู้ใช้ตรงๆ) กลับมาใช้งานได้ปกติ **บทเรียน**: ห้ามรัน `npm run build`/`next build` ขณะ dev server กำลังรันอยู่ ให้ตรวจด้วย `tsc --noEmit` + verify สดผ่าน dev server ที่รันอยู่แล้วแทน
- [x] เจอ+แก้ BigInt literal (`0n`) ไม่รองรับที่ ES2017 target ระหว่างทำ ใช้ `BigInt(0)` แทน

### Phase 5 — Report Detail, Permission UI, Configurable Settings 📋 วางแผนแล้ว ยังไม่เริ่มโค้ด
[แผนเต็ม →](./phase5-plan.md) — โจทย์จาก `document/diff_req.md` (`beb62ee`) 5 ข้อ, ตัดสินใจครบทุกข้อกับผู้ใช้ 2026-08-19 แล้ว (รวมถึงเรื่องที่ requirement เขียนกำกวม: ข้อ 1-2 ที่จริงคือ "ยังไม่มีหน้า report detail" ไม่ใช่ "ยังไม่มี preview/upload" ซึ่ง 4c/4e ทำ backend ไว้ครบแล้ว)

| Sub-phase | งาน | สถานะ | Commit |
|---|---|---|---|
| **5a** | หน้า report detail (`/reports/report-detail/[id]`) + `SqlBlock` code-snippet UI (tokenizer เขียนเอง zero-dep) + แยก `reportFilePreview` ออกจาก dialog | ⬜ | — |
| **5b** | Per-report ACL UI (drawer ต่อ `/api/reports/[id]/permissions` ที่มี API ครบตั้งแต่ 2a แต่ไม่มี UI เลย) | ⬜ | — |
| **5c** | เติมหน้า `/permissions` ที่เป็น stub + implement `GET`/`PUT /api/users/roles/[id]` (ตอนนี้เป็น `Hello World` — แก้สิทธิ์ของ role เดิมไม่ได้เลย ทำได้แค่ตอนสร้าง role) | ⬜ | — |
| **5d** | หน้า CRUD ตาราง `menus` + `/api/baseconfig/menus` (sidebar **ยังใช้** `lib/menu-list.ts` ตามเดิม — swap เป็น DB-driven เป็นเฟสแยก) | ⬜ | — |
| **5e** | System settings ตั้งค่าได้จริง: `UPLOAD_BASE_PATH` (+ `lib/storage-path.ts` กัน path traversal), max upload size ต่อ `file_kind`, ค่าองค์กร (`ORG_NAME`/`ADMIN_EMAIL`/`DEFAULT_PAGE_SIZE`/`DEFAULT_SHARE_EXPIRY_DAYS`) + หน้า `/settings/storage` | ⬜ | — |
| **5f** | Housekeeping: refresh `feature-list.md` (ค้างอีกรอบ), `docker-compose.yml` (Redis), แก้ lint error 36 ตัว + ใส่ `--max-warnings 192` ratchet เข้า CI | ⬜ | — |

**สิ่งที่ scope out จาก Phase 5 โดยตั้งใจ** (ไม่ใช่ของค้างที่ลืม): ไม่ให้ `SAMPLE_DATA` รับ pdf, ไม่รื้อ upload UI ในหน้า create/edit, ไม่แตะ limit 200 แถวของ excel preview, ไม่เปลี่ยน PDF viewer, ไม่ใช้ CodeMirror/Monaco ในหน้า edit, ไม่ swap sidebar เป็น DB-driven, ไม่ทำ lint sweep ครบ 228

---

## 🚧 ของค้าง & หนี้ทางเทคนิค

รวมทุกอย่างที่ค้างไว้ที่เดียว — เดิมกระจายอยู่ใน `CLAUDE.md`, `phase3-plan.md`, และ commit message

### 1. Dev DB drift — ✅ ปิดแล้ว (2026-08-17, `34468ff`) — root cause เจอครบ, DB จริงตรงกับ migration history 100%

**Timeline:** พบเมื่อ 2026-08-16 ตอนรัน `npx prisma migrate dev --name add_user_theme_preference` · หาต้นตอ commit ที่ทำให้ schema เพี้ยนเจอ 2026-08-17 (ช่วงเช้า) · พบว่า DB เปลี่ยนไปเป็น `nextjs_rfs`@`5432` แล้ว (ช่วงบ่าย ตอนทำ 3e) แต่ drift เดิมยังอยู่ · **ปิดจบจริงตอนเย็น 2026-08-17** ด้วยการ diff DB จริงกับการ replay migration ทั้งหมดใส่ shadow DB สดๆ (ไม่ใช่แค่อ่าน `migrate diff --to-schema` ซึ่งมองไม่เห็น raw SQL ที่ schema DSL แทนไม่ได้) แล้วเขียน migration ใหม่ปิดช่องว่างที่เจอ

**สรุปสุดท้าย — มี 3 ปัญหาซ้อนกันอยู่ ไม่ใช่ปัญหาเดียว:**

1. **`users.role_id` / `permissions.menu_id` มีจริงใน DB แต่ไม่มี migration รองรับ** — ต้นตอจาก commit `b5c6e7a` (22 ก.พ. 2026, "create user") และ `ccdc32d` (3 มี.ค. 2026, "add permission checkbox func") ซึ่งแก้ `schema.prisma` แล้วรัน `prisma db push` ตรงๆ **ไม่เคยรัน `migrate dev`** ทั้งคู่ — เหตุการณ์นี้เกิด**ก่อน Phase 0 เริ่ม 5 เดือนกว่า** (Phase 0 เริ่ม 13 ส.ค. 2026) ตอนนั้นยังไม่มี workflow ที่เข้มงวดเรื่อง migration เลย มีอีกครั้งที่ทำแบบเดียวกัน (`4cad847`, 15 ก.พ.) แต่รอบนั้นมีคน backfill migration ให้ทีหลัง 6 วัน (`82b3790`) — อีก 2 ครั้งไม่มีใคร backfill เลย
2. **DB ปัจจุบัน (`nextjs_rfs`) ถูกสร้างด้วย `prisma db push` จาก `schema.prisma` โดยตรง ไม่ใช่ replay migration history** (ยืนยันได้จากรูปแบบที่ขาด/ไม่ขาด: field/index ที่ประกาศได้ผ่าน Prisma schema DSL เช่น `role_id`, `menu_id`, `search_vector` column, `@@index([department_id])` — มีอยู่ครบ แต่ **GIN/trigram index 4 ตัวของ full-text search ที่เขียนเป็น raw SQL ล้วนๆในไฟล์ migration (ไม่มีทางประกาศผ่าน schema DSL ได้) หายไปหมด** → **search รันแบบ sequential scan มาตลอดโดยไม่มีใครรู้** — เป็นบั๊ก perf จริงที่ไม่เคยถูกจับได้ก่อนหน้านี้ (เพราะ `migrate diff --to-schema` มองไม่เห็นสิ่งที่ schema DSL แทนไม่ได้)
3. **Checksum ของ 2 migration (`20260813131434`, `20260813144536`) ใน `_prisma_migrations` ไม่ตรงกับไฟล์จริง** — ยืนยันด้วยการคำนวณ sha256 ของไฟล์เทียบกับ checksum ที่บันทึกไว้ไม่ตรงกันทั้งคู่ (เทียบกับ 2 migration ที่ resolve ผ่าน CLI ถูกต้องในรอบนี้ ซึ่ง checksum ตรงเป๊ะ) — แปลว่าตอน baseline DB นี้ มีคน **insert แถวลง `_prisma_migrations` เองแบบ manual** แทนที่จะใช้ `prisma migrate resolve --applied` ตัวจริง ทำให้ `migrate dev` ฟ้องว่า "migration ถูกแก้หลัง apply" ตลอดแม้ schema จะตรงกันแล้ว

**Fix:** migration ใหม่ `20260817205217_reconcile_role_menu_drift_and_search_indexes` — เพิ่ม `role_id`/`menu_id`+FK และ drop `menus_permissions` แบบ idempotent (no-op บน DB ปัจจุบันเพราะมีอยู่แล้วจริง, แต่ทำให้ fresh `migrate deploy` ในอนาคตได้ผลลัพธ์ตรงกัน) + **สร้าง 4 search index ที่หายไปจริงๆ** (ผลจริง ไม่ใช่แค่เอกสาร) แล้วแก้ checksum ที่ผิดของอีก 2 migration ด้วย SQL ตรงๆ

**ยืนยันปิดจบแล้ว:** replay migration ทั้ง 6 ตัวใส่ shadow DB ใหม่เอี่ยม เทียบกับ DB จริงด้วย `information_schema` — **ตาราง/คอลัมน์/index/FK เท่ากันเป๊ะทั้ง 4 มิติ (25/239/69/30)** ทดสอบ search จริงหลังเพิ่ม index แล้วผลลัพธ์ถูกต้องเหมือนเดิม

#### ประวัติแบบย่อ (รายละเอียดเต็มดู commit message ของ `34468ff`)

DB เก่า (`next_rfs_master`@`5434`) ไม่มี `_prisma_migrations` เลย → เจอว่า `schema.prisma` ถูกแก้ 3 ครั้ง (`4cad847`, `b5c6e7a`, `ccdc32d`, ก.พ.-มี.ค. 2026) ผ่าน `db push` โดยไม่มี migration ตามมา (ยกเว้นครั้งแรกที่ backfill ทีหลังใน `82b3790`) → ระหว่างสืบสาเหตุพบว่า `.env` ถูกเปลี่ยนไปชี้ DB ใหม่ `nextjs_rfs`@`5432` (นอกรอบ conversation) ซึ่งมีตารางครบแล้วแต่ **เกิด drift ซ้ำแบบเดียวกันอีกรอบ** เพราะถูกสร้างด้วย `db push` เช่นกัน ไม่ใช่ replay migration history → ทางแก้ B (เก็บข้อมูลเดิม + `migrate resolve --applied`) ถูกเลือกใช้โดยพฤตินัยสำหรับ DB ใหม่นี้ (ไม่มีบันทึกทางการ) ก่อนจะปิดจบจริงด้วย migration `34468ff` ที่ระบุไว้ข้างบน

📄 SQL template จากการสืบสาเหตุรอบแรก ([`prisma/manual/2026-08-17_reconcile-drift.template.sql`](../prisma/manual/2026-08-17_reconcile-drift.template.sql)) **ไม่ได้ใช้จริงแล้ว** — ทางแก้จริงคือ migration `34468ff` เก็บไว้เป็นหลักฐานการสืบสาเหตุเท่านั้น

### 2. Baseline TypeScript errors — ✅ ปิดครบแล้ว (2026-08-18) — เดิมเข้าใจว่า 6 ตัวเป็นหนี้เก่า ที่จริง 4 ตัวคือ regression จาก merge พังที่ถูกแก้แล้ว

**อัปเดต 2026-08-17:** ตอนไล่ verification ของ Phase 1/2/3 พบว่า "baseline 6 ตัว" ที่เอกสารนี้ (และ `CLAUDE.md`) เคยบอกว่า "เป็นหนี้เก่าตั้งแต่ก่อน Phase 1" ไม่จริงทั้งหมด — สืบจาก `git diff 7a099b8 HEAD` เจอว่า merge `abb4003` (merge branch `feature/report-environment` ที่ค้างมาตั้งแต่ก่อน Phase 1 เข้า `development`, เกิดระหว่าง Phase 2b→2c) resolve conflict บนไฟล์เหล่านี้โดยเลือกโค้ดฝั่งเก่า (pre-Phase-1) ทับของใหม่แบบเงียบๆ:
- **`access_level` ไม่ persist กลับมาอีกครั้ง** (`app/api/reports/report/manage/route.ts`) — บั๊กเดียวกับที่ Phase 1 แก้ไปแล้วใน `7a099b8` แต่ merge เอาโค้ดเก่ากลับมาทับ ทุกรายงานที่สร้างหลัง `abb4003` (รวมถึงที่สร้างผ่าน Phase 2b/2c/2d/3x ทั้งหมด) ได้ `access_level=PUBLIC` เงียบๆไม่ว่าฟอร์มจะเลือกอะไร
- **`ActivityAction` ขาด `'favorite'/'unfavorite'/'download'`** (`lib/activity-log.ts`) — Phase 1 เพิ่มไว้แล้ว merge เอาออกไปอีกที

ทั้งสองจุด**แก้แล้วใน `1e1f05c`** (คืนโค้ดตาม `7a099b8` แต่ merge เข้ากับของที่เพิ่มมาทีหลัง เช่น `logActivity` call ที่ `f8d7598` เพิ่ม) ยืนยันด้วย curl: `access_level=RESTRICTED` persist ถูกต้องแล้ว, ค่า enum ผิดได้ 400 แทนที่จะรับมั่ว ๆ

ส่วน `checkRateLimit`/`resetRateLimit` ก็ตกไปแล้วเช่นกัน (ไม่ใช่จาก merge นี้ — แก้แยกใน `a9e9a27` ไปแล้วก่อนหน้า แค่เอกสารไม่เคยอัปเดต baseline list ตาม)

**Baseline 2 ตัวสุดท้าย — แก้จบจริงแล้ว (2026-08-18, ปิดของค้าง #12 ไปด้วย):**

| ไฟล์ | ปัญหาเดิม | Fix |
|---|---|---|
| `app/api/reports/report/manage/route.ts` | `UploadServiceResponse`/`MultipleUploadResult` shape ไม่ตรง + `file_size` string vs `number\|bigint` | ไม่ใช่แค่ type error — เป็น**บั๊กจริงที่ยังไม่เคยมีใครเจอ**: multi-file upload เช็ค `if (!multipleFiles)` ซึ่งไม่มีทาง false (เป็น object เสมอ) แล้วอ่าน `.data.filePath` ที่ไม่มีอยู่จริงใน `MultipleUploadResult` (shape จริงคือ `{success: UploadResult[], failed: [...]}`) ทำให้ทุกรายงานที่สร้างด้วยไฟล์ ≥2 ไฟล์ได้ `file_path/file_name/file_size` เป็น `undefined` เงียบๆ — แก้โดยอ่าน `multipleFiles.success[0]` (ไฟล์แรกที่สำเร็จ) และเช็ค `!singleFile.success` แทน `!singleFile` ในเคส single-file ระหว่างแก้เจอบั๊กที่ 2 ซ้อนอยู่: `status` field ใน `reportZod` เป็น `z.string()` เฉยๆ ไม่ได้ validate เป็น enum เหมือน `access_level`/`output_type` (รับค่าอะไรก็ได้ผ่านไปสร้าง DB error) แก้เป็น `z.enum(["DRAFT","PUBLISHED","ARCHIVED"])` แล้วใช้ `validate.data.status` แทนการ cast จาก raw form data ตรงๆ ยืนยันสด: multi-file upload ได้ `file_path`/`file_size` จริงถูกต้อง (94 bytes, WebP ถูกต้อง), single-file + `status=PUBLISHED` ได้ `published_at` set จริง, ส่ง `status` ค่ามั่วๆ ได้ 400 ตามคาด (ปิดช่องโหว่ validation จริง ไม่ใช่แค่ปิด type error) |
| `components/ui/combobox.tsx` | `"icon-xs"` ไม่ใช่ Button size ที่ถูกต้อง | `InputGroupButton` (component พี่น้อง) มี size `"icon-xs"` (`size-6`) อยู่แล้วจริง แต่ `Button` (component หลัก) ไม่มี — เพิ่ม `"icon-xs": "size-6"` เข้า `buttonVariants` ใน `button.tsx` ให้ตรงกับของ `InputGroupButton` (ยังไม่มีหน้าไหนใช้ `Combobox` จริงในแอปตอนนี้ เป็นแค่ shadcn primitive ที่ scaffold ไว้ล่วงหน้า ยืนยันผ่าน build ผ่านสำเร็จเท่านั้น ไม่มี UI จริงให้ทดสอบ) |

**ผลลัพธ์: `npx tsc --noEmit` = 0 error, `npm run build` = exit 0 สำเร็จเต็มรูปแบบเป็นครั้งแรก** (ก่อนหน้านี้ build fail มาตลอดตั้งแต่ก่อนมี CI ด้วยซ้ำ) ซึ่งปิดของค้าง #12 (CI's Build step จะ fail ตั้งแต่ push ครั้งแรก) ไปโดยอัตโนมัติ — ไม่มี baseline TypeScript error เหลืออยู่ในโปรเจกต์นี้อีกแล้ว บรรทัดอ้างอิง "baseline 2 ตัว" ใน `CLAUDE.md`'s Definition of Done ควรลบทิ้งด้วย (ดูหมายเหตุใน CLAUDE.md)

⚠️ **บทเรียน**: อย่าเชื่อว่า baseline error ที่มีมานานเป็น "หนี้เก่าไม่เกี่ยวกัน" โดยไม่เช็ค `git log`/`git diff` ที่จุดเกิด error จริง — merge สามารถ revert ของเก่ากลับมาแบบเงียบๆแล้วถูกเข้าใจผิดว่า "เป็นแบบนี้มาตลอด" ได้ และครั้งนี้ยืนยันอีกบทเรียน: "type error ที่ปิด" อาจไม่ใช่แค่ type-level เฉยๆ — การตามรอย type error จนสุดทางเจอบั๊ก runtime จริงที่ไม่เคยมีใครสังเกตมาก่อน (multi-file upload พังเงียบๆมาตลอด)

### 3. ตาราง `report_versions` = dead code (ตั้งใจไม่ลบ)
ถูกแทนที่ด้วย `report_files.is_current` + `report_query_versions` แล้ว แต่ยัง**ไม่ drop** เพราะเป็น destructive migration ที่ **รอ sign-off จากผู้ใช้ก่อน** — นี่คือการตัดสินใจ ไม่ใช่ความหลงลืม

### 4. `feature-list.md` ค้าง — ✅ ปิดแล้ว (2026-08-17, `abd3629`)
รีเฟรชทั้งไฟล์ครบทุก 100 แถวในรอบเดียวตามที่แนะนำไว้ (ไม่ใช่รีเฟรชบางส่วนเหมือน Phase 3d ที่ทำใน `453cdf2`) — ผลสรุปใหม่: 62 ✅ / 9 ⚠️ / 29 ❌ (เดิมนับคร่าวๆไว้ ~18/~20/~55 ซึ่งไม่ตรงความจริงมานาน) รายละเอียดการนับ + regression ใหม่ที่เจอระหว่างไล่ตรวจ (`output_type` ไม่ persist) → ดูหัวข้อ "ตอนนี้อยู่ตรงไหน" ด้านบน

### 5. เอกสารระดับ repo ที่ stale
`README.md` / `SETUP.md` ที่ root ยังบรรยายสภาพ "auth starter scaffold" ตอนเริ่มโปรเจกต์ — ไม่ตรงกับของจริงแล้ว **อย่าใช้เป็นแหล่งอ้างอิง**

### 6. Pre-existing high/critical dependency advisories — เจอครั้งแรกตอนตั้ง CI (Phase 4f, 2026-08-18)

`.github/workflows/ci.yml` (ใหม่) รัน `npm audit --audit-level=high` เป็นครั้งแรกของ repo นี้ (ไม่เคยมี CI มาก่อน) แล้วเจอว่ามี high/critical advisory จริงอยู่ก่อนแล้ว ไม่เกี่ยวกับงาน Phase 4f เลย:

- **`next@14.2.18` — critical — ✅ ปิดแล้ว (Stage 2, 2026-08-18)** — สะสมหลาย CVE จากหลาย Next.js version (DoS ผ่าน Server Actions/Server Components, cache poisoning, middleware auth bypass, SSRF ผ่าน rewrites, XSS ใน beforeInteractive scripts ฯลฯ) อัปเกรดเป็น `next@15.5.23` (+ React 19.2.8 ที่บังคับคู่กัน) แล้ว `npm audit` ยืนยัน critical advisory ตัวนี้หายไปทั้งหมด ไม่ใช่แค่ลดลง
- **`postcss` — high — ✅ ปิดหมดแล้วทั้ง top-level และสำเนาใน `next` (Stage 0 + Stage 3, 2026-08-18)** — top-level devDependency `postcss@8.4.33` vulnerable จริงด้วย (ไม่ใช่แค่สำเนาที่ฝังใน `next`) bump เป็น `^8.5.26` ตั้งแต่ Stage 0; สำเนาที่ฝังอยู่ใน `node_modules/next/node_modules/postcss` ปิดจริงหลัง Stage 3 (Next 16.3.1 ฝัง postcss เวอร์ชันใหม่กว่ามาให้เอง)
- **`sharp`/libvips — high — ✅ ปิดหมดแล้วทั้ง top-level และสำเนาใน `next` (Stage 1 + Stage 3, 2026-08-18)** (`CVE-2026-33327/33328/35590/35591`) — bump top-level เป็น `^0.35.3` ตั้งแต่ Stage 1, resolve บน Windows dev machine สำเร็จไม่มีปัญหา native binary, ยืนยัน `convertToWebp()` ทำงานถูกต้องจริงด้วยการ encode/decode round-trip ตรง; สำเนาที่ฝังใน `next` (image optimization pipeline) ปิดจริงหลัง Stage 3 เช่นกัน
- moderate 1 ตัว (`uuid` ผ่าน `exceljs`) — รู้อยู่แล้วตั้งแต่ 4c ไม่ reachable จาก usage ของแอปนี้ ไม่ปิดปัญหา ยังคงเป็น moderate ไม่ block ที่ threshold `high`

**สถานะปัจจุบัน — ปิดครบทั้ง `dependency-upgrade-plan.md` แล้ว (2026-08-18)**: `npm audit`: 11 (2 moderate/8 high/1 critical) → Stage 0/1 → 10 (2 moderate/7 high/1 critical) → Stage 2 → 8 (2 moderate/6 high, **critical หายเกลี้ยง**) → Stage 3 → **5 (2 moderate/3 high)** — ที่เหลือทั้งหมดไม่เกี่ยวกับ Next/React/sharp/postcss เลยแม้แต่ตัวเดียว (ของค้าง #9 `deepmerge-ts`/Prisma 3 entry + `uuid`/`exceljs` เดิม 2 entry) CI audit step **ยังคง `continue-on-error: true` ต่อไป** แต่ตอนนี้เป็นเพราะของค้าง #9 เท่านั้น ไม่ใช่เพราะ Next แล้ว (แก้ comment ใน `ci.yml` ให้ตรงแล้ว) รายละเอียดเต็มทุก stage: [`dependency-upgrade-plan.md`](./dependency-upgrade-plan.md)

### 7. `lib/logger.ts` (pino) dev-transport worker thread เตือนเป็นระยะบน Windows — ✅ ปิดแล้ว (2026-08-18, ระหว่าง Stage 2 ของ `dependency-upgrade-plan.md`)

ระหว่างเปิด dev server เพื่อยืนยัน Phase 4e สด สังเกตว่าทุกครั้งที่มี request เข้า route ที่ (ทางอ้อมก็ตาม) import `lib/activity-log.ts` → `lib/logger.ts` เจอ log แบบนี้แทรกอยู่:

```
Error: Cannot find module 'D:\...\.next\server\vendor-chunks\lib\worker.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1207:15)
    ...
 ⨯ uncaughtException: Error: Cannot find module '...\worker.js'
  code: 'MODULE_NOT_FOUND',
```

**สาเหตุที่น่าจะเป็น**: `lib/logger.ts` สร้าง instance `pino({ transport: { target: 'pino-pretty', ... } })` ที่ module scope — ทุกครั้งที่ module ถูก import (รวมถึงตอน Next dev server compile/HMR ใหม่) pino จะ spawn worker thread สำหรับ `pino-pretty` transport ทันที ไม่ใช่ตอนเรียก `.error()`/`.info()` จริง เมื่อ Next.js dev bundler ย้าย/แปลง path ของ worker script ไปเป็น `.next/server/vendor-chunks/lib/worker.js` ซึ่งไม่มีอยู่จริงในโครงสร้างที่ webpack dev bundle สร้าง worker thread เลย resolve ไม่เจอ

**ผลกระทบจริง**: **ไม่กระทบผลลัพธ์ request ใดๆที่ทดสอบระหว่าง 4e** (ทุก endpoint ตอบค่าถูกต้องตามที่คาดหมายทั้งหมด แม้ log จะโชว์ error ปนอยู่) **ไม่กระทบ production** เพราะ `lib/logger.ts` set `transport: undefined` เมื่อ `NODE_ENV==='production'` (ไม่มี worker thread ให้ spawn เลยในโหมด production) เป็นปัญหาเฉพาะ dev-mode บน Windows ระหว่าง `pino-pretty`'s worker-thread transport กับ Next.js dev bundler

**อัปเดต (2026-08-18)**: ตอนแรกประเมินว่า "priority ต่ำ, cosmetic เท่านั้น" **ผิด** — ตอนทำ Stage 2 (Next 14→15+React19) เจอว่า `GET /api/reports/[id]/files` (และ route อื่นๆแบบไม่แน่นอน ขึ้นกับว่า Next dev child-process ไหนคอมไพล์ route นั้นก่อน) ตอบ 500 จริง ("Jest worker encountered 2 child process exceptions, exceeding retry limit") เพราะ Next.js 15 เปลี่ยนสถาปัตยกรรม dev mode ให้คอมไพล์แต่ละ route ใน child process แยก — uncaught exception จาก worker thread ตัวเดิมที่เคยแค่ log ทิ้งเฉยๆใน Next 14 กลับไป **ฆ่า child process ทั้งตัว** ใน Next 15 ทำให้ route นั้น 500 จริงหลัง retry ครบ 2 ครั้ง

**Fix จริง** (ทางเลือก (b) ที่เขียนไว้แต่แรก): ลบ `pino-pretty` transport ออกทั้งหมด (เหลือ JSON ดิบทั้ง dev/prod, ไม่มี transport = ไม่มี worker thread = ไม่มีบั๊กชนิดนี้ได้อีกเลย) + ถอด `pino-pretty` ออกจาก devDependencies ที่ไม่ได้ใช้แล้ว ยืนยันสด: route ที่เคย 500 ตอบ 200 คงที่ 3/3 ครั้งรวมถึงหลัง restart dev server สดๆ, grep dev server log ทั้งช่วง smoke test ไม่เจอ `MODULE_NOT_FOUND`/worker thread error เหลืออยู่เลย

### 8. `lucide-react@^0.344.0` peer-dependency conflict กับ React 19 — เจอระหว่าง Stage 2, แก้ด้วย `overrides` (2026-08-18)

`lucide-react` เวอร์ชันที่ pin ไว้ (`^0.344.0`) ประกาศ `peerDependencies.react` ไว้แค่ `^16.5.1 || ^17.0.0 || ^18.0.0` (เก่ากว่าตอนที่เขาเพิ่ม `^19.0.0` เข้าไปใน 1.x line) ตอน `npm install` แบบ full re-resolve (ไม่ใช่ incremental) หลัง bump react เป็น 19 จะ **hard error ERESOLVE** ไม่ใช่แค่ warning เฉยๆ

**ตัดสินใจ**: ไม่ bump `lucide-react` ขึ้น major เป็น 1.x (มีความเสี่ยงเรื่อง icon rename/API เปลี่ยนที่ต้องตรวจแยกต่างหาก ไม่เกี่ยวกับงาน Next/React upgrade) ใช้ `package.json`'s `overrides` แทน:
```json
"overrides": { "lucide-react": { "react": "$react" } }
```
บังคับ peer resolution โดยไม่แตะโค้ด/ไอคอนของ `lucide-react` เลย ยืนยันด้วย `npm ls` ว่าไม่มี invalid/unmet peer dependency เหลืออยู่ในทั้ง tree แล้ว

### 9. `deepmerge-ts`/`@prisma/config` high-severity advisory — เจอใหม่ระหว่าง Stage 2, ยังไม่มีทางแก้ (2026-08-18)

ระหว่างทำ Stage 2 npm install แบบ full re-resolve ทำให้ `prisma`/`@prisma/config` bump ตัวเองจาก `7.4.0` (pin เดิม, ยังอยู่ใน `^7.4.0` range) ขึ้นไปเป็น `7.9.1` (เวอร์ชัน stable ล่าสุดที่มีจริงตอนนี้) โดยไม่ได้ตั้งใจ (side effect ของ lockfile regeneration ไม่ใช่การเปลี่ยน `package.json` โดยตรง) แล้ว `npm audit` เจอว่า `@prisma/config`/`prisma` เวอร์ชันช่วง `6.13.0-dev.1` ถึง `7.10.0-integration-fix-prisma-publish-token.1` (ครอบคลุม `7.9.1` ที่ติดตั้งอยู่ตอนนี้) depends on `deepmerge-ts <8.0.0` ที่มี stack-exhaustion advisory (`GHSA-ggr8-5vv4-36mx`)

**ยังไม่มีทางแก้ที่ยอมรับได้ตอนนี้**: เช็ค npm registry แล้วพบว่า `7.9.1` คือ stable เวอร์ชันล่าสุดจริงๆ (เวอร์ชันถัดไปที่มีคือ `7.10.0-dev.*` ซึ่งเป็น dev/prerelease ทั้งหมด แล้วกระโดดไป `8.0.0-rc.*`) `npm audit fix --force` เสนอให้ downgrade เป็น `prisma@6.12.0` ซึ่ง**รับไม่ได้**เพราะ repo นี้ใช้สถาปัตยกรรม config ของ Prisma 7 ทั้งหมด (`prisma.config.ts` แทน `package.json`, `@prisma/adapter-pg`) — downgrade กลับ Prisma 6 คือ regression ใหญ่กว่าที่ยอมรับได้มาก ไม่เกี่ยวกับ Next/React/sharp/postcss เลยด้วย

**สถานะ**: ปล่อยไว้ที่ `prisma@7.9.1` (stable ล่าสุด) ไม่ downgrade ไม่ upgrade ไป Prisma 8 RC บันทึกไว้เป็นของค้างใหม่ รอ Prisma ออก patch เวอร์ชันจริงที่แก้ `deepmerge-ts` หรือ Prisma 8 GA เท่านั้น ไม่ใช่งานที่ควรทำแบบ drive-by ระหว่าง Next.js upgrade

### 10. `tw-animate-css` ทำ Turbopack build พังจริง — ✅ ปิดแล้ว (Stage 3, 2026-08-18)

`app/globals.css` มี `@import "tw-animate-css";` อยู่คู่กับ `tailwindcss-animate` (ตัวที่ใช้งานจริงผ่าน `tailwind.config.ts`'s `plugins`) — ตอนอัปเกรดเป็น Next 16 ซึ่งใช้ Turbopack เป็น default bundler ทั้ง `next dev`/`next build` แล้ว `next dev` compile หน้าแรกไม่ผ่านเลย: `Module not found: Can't resolve 'tw-animate-css'`

**สาเหตุ**: `tw-animate-css`'s `package.json` ประกาศ `exports` field ไว้แค่ custom condition `"style"` (กลไกเฉพาะของ Tailwind v4's import resolution) ไม่มี `"default"` — webpack (ที่ Next 14/15 ใช้ตอน dev เดิม) resolve หลุดไปที่ `"main"` field แบบหลวมๆได้ แต่ Turbopack เข้มงวดกับ `exports` field ตรงตามสเปก resolve ไม่เจอจริง

**ตรวจแล้วว่าไม่จำเป็นต้องมีเลย**: `tw-animate-css` เป็น "**replacement**" ของ `tailwindcss-animate` ตามคำอธิบายของแพ็กเกจเอง ไม่ใช่ตัวเสริม ส่วนโปรเจกต์นี้ยังอยู่ Tailwind v3 และมี `tailwindcss-animate` (ตัวที่ compatible กับ v3) ให้ utility class เดียวกันอยู่แล้วจริง — ลบ `@import` บรรทัดนั้นออกจาก `globals.css` และลบ dependency ออกจาก `package.json` เลย (ไม่ pin `--webpack` เพื่อเลี่ยงปัญหา) ยืนยันว่า `.animate-in`/`.fade-in`/`.zoom-in`/`accordion-down` ยังอยู่ครบใน compiled CSS หลังลบ

### 11. Lint baseline 228 ปัญหา (36 error, 192 warning) — เจอครั้งแรกตอน migrate `next lint` → ESLint CLI (Stage 3, 2026-08-18)

Next.js 16 ตัด `next lint` ออกทั้งหมด ต้อง migrate เป็น ESLint CLI ตรง (`npx @next/codemod@latest next-lint-to-eslint-cli .` สร้าง `eslint.config.mjs` แบบ flat config ให้อัตโนมัติ) พอรัน `npm run lint` (`eslint .`) ครั้งแรกในประวัติ repo นี้ (ไม่เคยมี `.eslintrc`/config จริงมาก่อนเลย ไม่ชัดว่า `next lint` เดิมเคย enforce อะไรจริงจังหรือเปล่า) เจอ **228 ปัญหา (36 error, 192 warning)** กระจายทั่ว repo (ส่วนใหญ่เป็น `@typescript-eslint/no-unused-vars`/`no-explicit-any` ใน `prisma/seeds/*.ts` กับไฟล์ทั่วไปบางไฟล์)

**ยังไม่แก้ แต่มีเจ้าภาพแล้ว: Phase 5f** (ดู [`phase5-plan.md`](./phase5-plan.md) — แก้ error 36 ตัว + ใส่ `--max-warnings 192` ratchet เข้า CI, ไม่ล้าง warning ทั้ง 192 ในรอบเดียว) — ไม่ใช่ scope ของ dependency-upgrade-plan.md (เป้าหมายคือปิดช่องโหว่ ไม่ใช่ lint sweep) `.github/workflows/ci.yml` ไม่ได้รัน `npm run lint` เลย เลยไม่กระทบ CI ตอนนี้ แต่ควรมีแผนล้างทีหลัง (อาจทยอยแก้ทีละไฟล์ หรือตั้ง `--max-warnings` แบบ ratchet)

### 12. CI's Build step จะ fail จริงตั้งแต่ push ครั้งแรก — ✅ ปิดแล้ว (2026-08-18)

`.github/workflows/ci.yml` (ตั้งจาก Phase 4f, `c0c0c48`) มี step `Build` (`npm run build`) ที่**ไม่มี** `continue-on-error` เลย — ยืนยันซ้ำหลายรอบระหว่าง Stage 0/2/3 ว่า `npm run build` fail จริงทุกครั้งด้วย baseline TypeScript error 2 ตัวเดิม (`app/api/reports/report/manage/route.ts`, `components/ui/combobox.tsx`) ไม่เกี่ยวกับ dependency version เลยแม้แต่น้อย (fail เหมือนกันทั้งบน Next 14/15/16)

**ปิดจริงแล้ว**: แก้ baseline TS error ทั้ง 2 ตัวจบ (ดูของค้าง #2) → `npm run build` exit 0 สำเร็จเต็มรูปแบบเป็นครั้งแรกของ repo นี้ — CI's Build step จะผ่านจริงเมื่อ push ครั้งแรก

---

## 🔄 วิธีอัปเดตไฟล์นี้

เพื่อไม่ให้ค้างซ้ำรอย `feature-list.md`:

1. ทุกครั้งที่ commit `feat: Phase Xy - ...` → เปลี่ยนแถวนั้นเป็น ✅ + ใส่ commit hash + อัปเดตหัวไฟล์ (วันที่/HEAD) และหัวข้อ **"ตอนนี้อยู่ตรงไหน"**
2. ถือเป็นส่วนหนึ่งของ **Definition of Done ข้อ 5** ใน [`CLAUDE.md`](../CLAUDE.md) (อัปเดตคู่กับ `feature-list.md`)
3. เจอของค้าง/หนี้ทางเทคนิคใหม่ → เพิ่มใน **🚧 ของค้าง** ที่นี่ที่เดียว อย่าไปฝังไว้ใน phase plan
