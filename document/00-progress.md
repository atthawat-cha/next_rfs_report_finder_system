# ความคืบหน้าโครงการ — RFS Report Finder System

> **อัปเดตล่าสุด:** 2026-08-17 · **Branch:** `feature/phase3` · **HEAD:** `34468ff`
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

**โค้ดเสร็จแล้ว:** Phase 0 → 3e ทั้งหมด (14 sub-phase) — ครบวงจรตั้งแต่ค้นหา/ดาวน์โหลดฝั่งผู้ใช้ ไปจนถึง CRUD รายงาน + ไฟล์ + คิวรี่ + สิทธิ์รายรายงาน + version rollback + แชร์ + แจ้งเตือน + dashboard + persist ธีมต่อผู้ใช้

> ### ✅ DB drift (ของค้าง #1) ปิดจบแล้ว (2026-08-17, `34468ff`)
>
> ระหว่างทำ 3e พบว่า `.env`/`.env.local` ชี้ไปที่ DB คนละตัวจากที่เคยบันทึกไว้ (`nextjs_rfs`@`5432` แทน `next_rfs_master`@`5434` เดิม) และมี schema drift แบบเดียวกับที่เคยบล็อก 3e อยู่ — สืบสาเหตุจนจบแล้ว: root cause คือ 2 รอบของการแก้ `schema.prisma` ผ่าน `db push` ตรงๆ โดยไม่มี migration ตามมา (ก.พ.-มี.ค. 2026, ก่อน Phase 0 เริ่ม 5 เดือนกว่า) บวกกับ DB ปัจจุบันถูกสร้างด้วย `db push` เช่นกันแทนที่จะ replay migration history จริง ทำให้ full-text search index 4 ตัวหายไปโดยไม่มีใครรู้ (search รัน sequential scan มาตลอด) — เขียน migration ใหม่ปิดช่องว่างครบทุกจุดแล้ว ยืนยันด้วยการ replay migration ทั้งหมดใส่ shadow DB เทียบกับ DB จริง **ตรงกันเป๊ะทั้ง 25 ตาราง/239 คอลัมน์/69 index/30 FK** รายละเอียดเต็ม → [ของค้าง #1](#1-dev-db-drift--✅-ปิดแล้ว-2026-08-17-34468ff--root-cause-เจอครบ-db-จริงตรงกับ-migration-history-100)

**ค้างอยู่:** ไม่มีงานเฟส 0-3 ค้างแล้ว — Phase 3e เสร็จใน `f27a1dc`

> ### ✅ Verification ของ Phase 1/2a-2d/3a-3d รันจริงแล้วบน DB `nextjs_rfs` (2026-08-17) — ผ่านทั้งหมด 39/39
>
> ไล่ตาม bullet list ทุกข้อใน `phase1-plan.md`/`phase2-plan.md`/`phase3-plan.md` ด้วย curl/psql/tsx จริง (ไม่ใช่อ่านโค้ดเดา) — **ผ่านหมด 39/39** รวม `tsc --noEmit` ตรงกับ baseline ที่แก้ไว้ (ดูของค้าง #2)
>
> ระหว่างทางเจอบั๊กจริงเพิ่ม 1 ตัว (ไม่เกี่ยวกับของค้าง #2): **`app/api/shares/[token]/route.ts`** อ่านไฟล์สำหรับดาวน์โหลดจาก `report_files` (ตาราง Phase 2) เท่านั้น ไม่ fallback ไปที่ `reports.file_path`/`file_name` (cache column เดิม) เลย — รายงานที่สร้างก่อน Phase 2 หรือยังไม่เคยอัปโหลดไฟล์ผ่าน `/api/reports/[id]/files` จะได้ `files: []` จากลิงก์แชร์ ทั้งที่ดาวน์โหลดผ่าน endpoint ปกติได้ปกติ (ยืนยันซ้ำกับ `RPT-002`) — **แก้แล้วใน `be5a772`** (fallback ไป `reports.file_path`/`file_name` เมื่อ `report_files` ว่าง, ยืนยันว่า `can_download=false` ไม่รั่ว path)
>
> **Test fixtures ที่ verification สร้างไว้ — ลบออกหมดแล้ว** (user `TEST-user2`, reports `TEST-*` 7 รายงาน, `report_shares`/`favorites`/`notifications` ที่เกี่ยวข้อง, ไฟล์ upload บน disk) DB กลับสู่สภาพเดิมก่อน verification (reports=5, users=4, ทุกตาราง Phase 2/3 ว่างเหมือนก่อนหน้า)

**งานถัดไปที่ควรทำ (เรียงตามลำดับ):**
1. **รีเฟรช `feature-list.md`** — refresh แล้วเฉพาะแถว 3e (FR-13 theme) ที่เหลือ Phase 1/2/3a-3c ยังมีจุดที่ค้าง ❌ ให้เช็คทั้งไฟล์ (ดู [ของค้าง #4](#4-feature-listmd-ค้าง))
2. **วางแผน Phase 4** — ยังไม่มี `phase4-plan.md` เลย ทั้งที่ `feature-list.md` อ้างถึง Phase 4 อยู่หลายสิบแถว

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

### Phase 4 — Hardening & Enterprise Features 📝
**ยังไม่มี `phase4-plan.md`** — `feature-list.md` อ้างถึง Phase 4 ไว้หลายสิบแถว แต่ยังไม่เคยแตกเป็นแผนจริง งานที่ถูก defer มาที่นี่:

| งาน | Priority (จาก feature-list) |
|---|---|
| Antivirus scan ไฟล์อัปโหลด (ClamAV) | Should |
| Security headers (CSP, HSTS, X-Content-Type-Options) | Must |
| Two-Factor Authentication (TOTP) — มีคอลัมน์ schema รอ logic แล้ว | Could |
| ตั้งค่าวิธียืนยันตัวตนจากหน้า Settings (Local DB / External API / Email OTP) | Should |
| Password policy / `password_changed_at` enforcement | Could |
| Dependency vulnerability scanning (CI) | Should |
| Structured logging + error tracking (pino/Sentry) | Should |
| Automated test suite — **ยังไม่มี test runner ในโปรเจกต์เลย** เริ่มจาก `lib/report-acl.ts` ก่อน | Must |
| i18n ไทย/อังกฤษเป็นระบบ (`next-intl`) — ตอนนี้ hardcode ปนกัน | Should |

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

### 4. `feature-list.md` ค้าง
ยังขึ้น ❌ ให้แถวของ Phase 1 / 2 / 3a-3c ทั้งที่ ship และ commit ไปหมดแล้ว (Phase 3d รีเฟรชแล้วบางส่วนใน `453cdf2`) → **Summary Counts ท้ายไฟล์นั้นเชื่อไม่ได้** ควรรีเฟรชทั้งไฟล์ในรอบเดียว

### 5. เอกสารระดับ repo ที่ stale
`README.md` / `SETUP.md` ที่ root ยังบรรยายสภาพ "auth starter scaffold" ตอนเริ่มโปรเจกต์ — ไม่ตรงกับของจริงแล้ว **อย่าใช้เป็นแหล่งอ้างอิง**

---

## 🔄 วิธีอัปเดตไฟล์นี้

เพื่อไม่ให้ค้างซ้ำรอย `feature-list.md`:

1. ทุกครั้งที่ commit `feat: Phase Xy - ...` → เปลี่ยนแถวนั้นเป็น ✅ + ใส่ commit hash + อัปเดตหัวไฟล์ (วันที่/HEAD) และหัวข้อ **"ตอนนี้อยู่ตรงไหน"**
2. ถือเป็นส่วนหนึ่งของ **Definition of Done ข้อ 5** ใน [`CLAUDE.md`](../CLAUDE.md) (อัปเดตคู่กับ `feature-list.md`)
3. เจอของค้าง/หนี้ทางเทคนิคใหม่ → เพิ่มใน **🚧 ของค้าง** ที่นี่ที่เดียว อย่าไปฝังไว้ใน phase plan
