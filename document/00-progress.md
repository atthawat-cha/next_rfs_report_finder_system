# ความคืบหน้าโครงการ — RFS Report Finder System

> **อัปเดตล่าสุด:** 2026-08-17 · **Branch:** `feature/phase4` · **HEAD:** `e3e3978`
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

**โค้ดเสร็จแล้ว:** Phase 0 → 3e ทั้งหมด (14 sub-phase, verified จริง 39/39 บน DB `nextjs_rfs`) + **Phase 4a/4b/4c/4d เสร็จ**, 4f เริ่มแล้วบางส่วน (structured logging), 4e เหลือ overview เท่านั้น

> หมายเหตุ branch: ย้ายมาทำงานบน `feature/phase4` แล้ว (เดิม `feature/phase3`) — commit ประวัติเดียวกัน ไม่มีอะไรหาย ดู git log ถ้าสงสัย

**ค้างอยู่:** ไม่มีงานเฟส 0-3 ค้างแล้ว — Phase 4d ทดสอบครบยกเว้น full login-flow กับ Redis (ดูรายละเอียดใน 4d ด้านล่าง)

**งานถัดไปที่ควรทำ (เรียงตามลำดับ):**
1. **ยืนยัน 4d's login flow แบบเต็มเมื่อ Redis reachable จริง** — enroll 2FA → login → `verify-2fa` → ได้ session จริง (ยังไม่เคยทดสอบ end-to-end)
2. **ตัดสินใจสโคปของ 4e ที่เหลือ** (max upload size, department sharing, expiry/system notification) — ทั้งหมด decision-free แล้ว รอแค่หยิบมาทำ
3. **4f ที่เหลือ**: dependency vulnerability scanning (ต้องตั้ง CI ก่อน — ยังไม่มี `.github/workflows/` เลย), abnormal-auth-pattern alerting, dashboard cache/precompute
2. **ตัดสินใจ 3 คำถามเปิดของ Phase 4** ก่อนแตกแผนละเอียด 4b/4d/4f ต่อ — test framework (4b), ต้องการ auth-provider/storage-backend abstraction จริงไหม (4d/4e), vendor logging/error-tracking (4f) — ดู `phase4-plan.md`
3. **พิจารณาช่องว่างเล็กๆที่ feature-list.md รีเฟรชเจอ** (ตอนนี้อยู่ใน scope ของ 4c overview แล้ว): ดาวน์โหลด `SAMPLE_FILLED_FORM`/ไฟล์ตาม `file_kind` แยกสำหรับ user ทั่วไป, PDF/Excel inline preview, print ฝั่ง client, `view_count` ที่ยังตายอยู่

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
| 4e | Settings ที่เหลือ + notification ที่ defer ไว้ (max upload size, department sharing, expiry/system notif — storage backend dropped, aspirational) | 📝 scope narrowed | — |
| 4f | Observability & ops — structured logging ✅ (`lib/logger.ts`, pino), ที่เหลือ (dependency scanning, alert, dashboard cache) ยัง 📝 | 🚧 | `f222dca` |

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
- ⚠️ **ไม่ได้ทดสอบ login flow แบบเต็ม (2FA-enabled → verify-2fa → session)** — Redis ใน environment นี้เชื่อมต่อไม่ได้หลังจากลองหลายรอบ (ทั้ง `localhost:6379`/`:6380`, `netstat` ยืนยันว่าไม่มีอะไร listen จริง) ผู้ใช้ตัดสินใจข้ามการตรวจนี้ไปก่อน — ถ้าจะกลับมาทำ ให้ยืนยัน Redis reachable จริงจากเครื่องที่รัน dev server ก่อน (`redis-cli ping`)

**4f — เริ่มแล้ว** (`f222dca`, ยังไม่จบทั้ง sub-phase):
- [x] `lib/logger.ts` (pino, self-hosted ตามที่ผู้ใช้เลือก) + wire เข้า `logActivity`'s swallowed catch
- [x] **ไม่แตะ** `lib/auth.ts`'s swallowed catches ตามที่ระบุใน plan เดิม — เจอว่า `middleware.ts` import `getAuthFromRequest` จากไฟล์นี้และรันบน Edge runtime ซึ่ง bundle worker-thread ของ pino ไม่ได้ (ปัญหาเดียวกับที่ `lib/rate-limit.ts`/`ioredis` ต้องแยกออกจาก `lib/auth.ts` อยู่แล้ว)
- [ ] Dependency vulnerability scanning (CI), abnormal-auth-pattern alerting, dashboard cache/precompute — ยังไม่ทำ

> ⚠️ **เหตุการณ์ระหว่างทำ 4a**: รัน `npm run build` เพื่อตรวจ header เจอ EPERM ชน `.next/trace` เพราะ dev server ของผู้ใช้ (port 3501) ใช้โฟลเดอร์ `.next` เดียวกันอยู่พร้อมกัน — build ที่ fail กลางคันไปลบ `.next/server/middleware-manifest.json` ทำให้ dev server ตอบ 500 ทุก request ล้างแคช `.next` แล้วขอให้ผู้ใช้ restart dev server เอง (ไม่แตะ process ของผู้ใช้ตรงๆ) กลับมาใช้งานได้ปกติ **บทเรียน**: ห้ามรัน `npm run build`/`next build` ขณะ dev server กำลังรันอยู่ ให้ตรวจด้วย `tsc --noEmit` + verify สดผ่าน dev server ที่รันอยู่แล้วแทน
- [x] เจอ+แก้ BigInt literal (`0n`) ไม่รองรับที่ ES2017 target ระหว่างทำ ใช้ `BigInt(0)` แทน

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

### 2. Baseline TypeScript errors — เดิมเข้าใจว่า 6 ตัวเป็นหนี้เก่า ที่จริง 4 ตัวคือ regression จาก merge พังที่ถูกแก้แล้ว

**อัปเดต 2026-08-17:** ตอนไล่ verification ของ Phase 1/2/3 พบว่า "baseline 6 ตัว" ที่เอกสารนี้ (และ `CLAUDE.md`) เคยบอกว่า "เป็นหนี้เก่าตั้งแต่ก่อน Phase 1" ไม่จริงทั้งหมด — สืบจาก `git diff 7a099b8 HEAD` เจอว่า merge `abb4003` (merge branch `feature/report-environment` ที่ค้างมาตั้งแต่ก่อน Phase 1 เข้า `development`, เกิดระหว่าง Phase 2b→2c) resolve conflict บนไฟล์เหล่านี้โดยเลือกโค้ดฝั่งเก่า (pre-Phase-1) ทับของใหม่แบบเงียบๆ:
- **`access_level` ไม่ persist กลับมาอีกครั้ง** (`app/api/reports/report/manage/route.ts`) — บั๊กเดียวกับที่ Phase 1 แก้ไปแล้วใน `7a099b8` แต่ merge เอาโค้ดเก่ากลับมาทับ ทุกรายงานที่สร้างหลัง `abb4003` (รวมถึงที่สร้างผ่าน Phase 2b/2c/2d/3x ทั้งหมด) ได้ `access_level=PUBLIC` เงียบๆไม่ว่าฟอร์มจะเลือกอะไร
- **`ActivityAction` ขาด `'favorite'/'unfavorite'/'download'`** (`lib/activity-log.ts`) — Phase 1 เพิ่มไว้แล้ว merge เอาออกไปอีกที

ทั้งสองจุด**แก้แล้วใน `1e1f05c`** (คืนโค้ดตาม `7a099b8` แต่ merge เข้ากับของที่เพิ่มมาทีหลัง เช่น `logActivity` call ที่ `f8d7598` เพิ่ม) ยืนยันด้วย curl: `access_level=RESTRICTED` persist ถูกต้องแล้ว, ค่า enum ผิดได้ 400 แทนที่จะรับมั่ว ๆ

ส่วน `checkRateLimit`/`resetRateLimit` ก็ตกไปแล้วเช่นกัน (ไม่ใช่จาก merge นี้ — แก้แยกใน `a9e9a27` ไปแล้วก่อนหน้า แค่เอกสารไม่เคยอัปเดต baseline list ตาม)

**Baseline ที่เหลือจริง ๆ ตอนนี้ — 2 ตัว:**

| ไฟล์ | ปัญหา |
|---|---|
| `app/api/reports/report/manage/route.ts` | `UploadServiceResponse`/`MultipleUploadResult` shape ไม่ตรง + `file_size` string vs `number\|bigint` |
| `components/ui/combobox.tsx` | `"icon-xs"` ไม่ใช่ Button size ที่ถูกต้อง |

⚠️ **บทเรียน**: อย่าเชื่อว่า baseline error ที่มีมานานเป็น "หนี้เก่าไม่เกี่ยวกัน" โดยไม่เช็ค `git log`/`git diff` ที่จุดเกิด error จริง — merge สามารถ revert ของเก่ากลับมาแบบเงียบๆแล้วถูกเข้าใจผิดว่า "เป็นแบบนี้มาตลอด" ได้

### 3. ตาราง `report_versions` = dead code (ตั้งใจไม่ลบ)
ถูกแทนที่ด้วย `report_files.is_current` + `report_query_versions` แล้ว แต่ยัง**ไม่ drop** เพราะเป็น destructive migration ที่ **รอ sign-off จากผู้ใช้ก่อน** — นี่คือการตัดสินใจ ไม่ใช่ความหลงลืม

### 4. `feature-list.md` ค้าง — ✅ ปิดแล้ว (2026-08-17, `abd3629`)
รีเฟรชทั้งไฟล์ครบทุก 100 แถวในรอบเดียวตามที่แนะนำไว้ (ไม่ใช่รีเฟรชบางส่วนเหมือน Phase 3d ที่ทำใน `453cdf2`) — ผลสรุปใหม่: 62 ✅ / 9 ⚠️ / 29 ❌ (เดิมนับคร่าวๆไว้ ~18/~20/~55 ซึ่งไม่ตรงความจริงมานาน) รายละเอียดการนับ + regression ใหม่ที่เจอระหว่างไล่ตรวจ (`output_type` ไม่ persist) → ดูหัวข้อ "ตอนนี้อยู่ตรงไหน" ด้านบน

### 5. เอกสารระดับ repo ที่ stale
`README.md` / `SETUP.md` ที่ root ยังบรรยายสภาพ "auth starter scaffold" ตอนเริ่มโปรเจกต์ — ไม่ตรงกับของจริงแล้ว **อย่าใช้เป็นแหล่งอ้างอิง**

---

## 🔄 วิธีอัปเดตไฟล์นี้

เพื่อไม่ให้ค้างซ้ำรอย `feature-list.md`:

1. ทุกครั้งที่ commit `feat: Phase Xy - ...` → เปลี่ยนแถวนั้นเป็น ✅ + ใส่ commit hash + อัปเดตหัวไฟล์ (วันที่/HEAD) และหัวข้อ **"ตอนนี้อยู่ตรงไหน"**
2. ถือเป็นส่วนหนึ่งของ **Definition of Done ข้อ 5** ใน [`CLAUDE.md`](../CLAUDE.md) (อัปเดตคู่กับ `feature-list.md`)
3. เจอของค้าง/หนี้ทางเทคนิคใหม่ → เพิ่มใน **🚧 ของค้าง** ที่นี่ที่เดียว อย่าไปฝังไว้ใน phase plan
