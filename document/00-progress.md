# ความคืบหน้าโครงการ — RFS Report Finder System

> **อัปเดตล่าสุด:** 2026-08-17 · **Branch:** `feature/phase3` · **HEAD:** `1e1f05c`
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

> ### 🟡 DB คนละตัวกับที่เอกสารนี้เคยพูดถึง — อ่านก่อนรันโปรเจกต์
>
> ระหว่างทำ 3e (2026-08-17) พบว่า `.env`/`.env.local` ถูกชี้ไปที่ **DB คนละตัว** จากที่บันทึกไว้ก่อนหน้านี้: `nextjs_rfs`@`localhost:5432` แทน `next_rfs_master`@`5434` เดิม (เปลี่ยนนอกรอบ conversation นี้ — ไฟล์ `.env*` ไม่ได้ถูก track ใน git เลยหาต้นตอที่แน่ชัดไม่ได้)
>
> **ข่าวดี:** DB ใหม่นี้มีครบทั้ง 25 ตาราง ตรงกับ `schema.prisma` ปัจจุบันแล้ว (`report_files`/`queries`/`variables`/`permissions`, `reports.search_vector`, `output_type` ครบ) — Phase 1/2/3 **น่าจะ**รันได้จริงบน DB นี้ (ยังไม่ได้ไล่ verification list ใหม่ทีละเฟส แค่ยืนยันว่าตารางที่ขาดหายไปก่อนหน้านี้กลับมาครบ)
>
> **แต่ของค้าง #1 (drift) ยังไม่ได้แก้จริง แค่ย้ายไป DB ใหม่พร้อมกัน** — `npx prisma migrate dev` ยัง detect drift signature เดิมเป๊ะ (`menus_permissions` หาย, `users.role_id`/`permissions.menu_id` เพิ่มมาไม่มี migration รองรับ) และ `_prisma_migrations` มี `applied_steps_count=0` ทุกแถว → มีคนรัน **Option B** (`migrate resolve --applied`) ไปแล้วกับ DB นี้ก่อนหน้า session นี้ โดยไม่อัปเดตเอกสาร ตอนทำ migration ของ 3e ก็ใช้ pattern เดียวกันต่อ (เขียน SQL มือ + `resolve --applied`) ไม่ใช้ `migrate reset`
>
> รายละเอียด → [ของค้าง #1](#1-dev-db-ไม่เคยถูก-migrate-เลย--บล็อก-phase-3e-และ-phase-123) (อัปเดตแล้ว)

**ค้างอยู่:** ไม่มีงานเฟส 0-3 ค้างแล้ว — Phase 3e เสร็จใน `f27a1dc`

**งานถัดไปที่ควรทำ (เรียงตามลำดับ):**
1. **ไล่ Verification list ของ Phase 1/2/3a-3d ใหม่บน DB `nextjs_rfs`** — ยังไม่เคยรันจริงบน DB ตัวนี้ทีละเฟส (แค่ยืนยันว่าตารางครบตอนทำ 3e) ควรทำก่อนเชื่อว่า Phase ก่อนหน้าใช้งานได้จริง
2. **ตัดสินใจ root cause ของของค้าง #1 ให้จบจริง** — ใครรัน Option B ไปแล้ว, ทำไม `menus_permissions`/`role_id`/`menu_id` ถึงเปลี่ยนแบบไม่มี migration — ไม่งั้น drift แบบเดิมจะเกิดซ้ำทุกครั้งที่แก้ schema
3. **รีเฟรช `feature-list.md`** — refresh แล้วเฉพาะแถว 3e (FR-13 theme) ที่เหลือ Phase 1/2/3a-3c ยังมีจุดที่ค้าง ❌ ให้เช็คทั้งไฟล์ (ดู [ของค้าง #4](#4-feature-listmd-ค้าง))
4. **วางแผน Phase 4** — ยังไม่มี `phase4-plan.md` เลย ทั้งที่ `feature-list.md` อ้างถึง Phase 4 อยู่หลายสิบแถว

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

### 1. Dev DB drift — เดิมบล็อก Phase 3e, ตอนนี้ baseline ทับไปแล้วแต่ root cause ยังไม่จบ
**พบเมื่อ:** 2026-08-16 ตอนรัน `npx prisma migrate dev --name add_user_theme_preference` · **หาสาเหตุเจอ:** 2026-08-17 · **อัปเดต 2026-08-17 (รอบทำ 3e):** `.env`/`.env.local` ถูกเปลี่ยนไปชี้ DB ใหม่ `nextjs_rfs`@`5432` (นอกรอบ conversation, ไฟล์ env ไม่ track ใน git) — ตรวจแล้วว่า DB ใหม่นี้มีตารางครบ 25 ตัวตรงกับ schema แล้ว แต่ **drift เดิมยังอยู่**: `npx prisma migrate dev` บน DB ใหม่ยัง report drift signature เดิมเป๊ะ และ `_prisma_migrations` ทุกแถวมี `applied_steps_count=0` (= ถูก `migrate resolve --applied` มาก่อน ไม่ได้ apply จริงผ่าน `migrate deploy`) สรุปคือ**มีคนรัน Option B (ด้านล่าง) ไปแล้วกับ DB ตัวนี้** ก่อน session นี้ โดยไม่ได้บันทึกไว้ที่นี่ — 3e's migration (`20260817182535_add_user_theme_preference`) ทำตาม pattern เดียวกันต่อ (SQL มือ + `resolve --applied`) เพื่อไม่ชนปัญหาเดิมซ้ำ **ของค้างนี้จึงยังไม่ปิด** แค่ไม่บล็อกงานแล้ว — ยังต้องหาว่าใคร/ทำไมถึง drift (`users.role_id`, `permissions.menu_id`, drop `menus_permissions`) แบบไม่มี migration record

#### ต้นเหตุ
`next_rfs_master` (localhost:5434) **ไม่มีตาราง `_prisma_migrations` อยู่เลย** — ไม่ใช่ว่ามีแล้วข้อมูลไม่ตรง แต่คือไม่เคยมี DB นี้ถูกสร้างด้วย `prisma db push` ล้วน ๆ ไม่เคยรัน `migrate dev`/`migrate deploy` สักครั้ง

```
npx prisma migrate status
→ 4 migrations found ... Following migrations have not yet been applied:
   20260214094853_init                                          ← แม้แต่ init
   20260220163341
   20260813131434_add_report_search
   20260813144536_report_files_queries_variables_permissions
```

Prisma จึงเจอ DB ที่มี 20 ตารางแต่ไม่มีบันทึกว่าอะไร apply ไปแล้ว → ทางเดียวที่มันเสนอได้คือ `reset`

#### จุดที่ `db push` เกิดขึ้น (ยืนยันจาก git)
`schema.prisma` ถูกแก้ 3 commit โดยไม่มี migration ตามมา:

| Commit | แก้อะไร | migration |
|---|---|---|
| `4cad847` | เพิ่ม `menus`, `menus_permissions`, `can_view/create/update/delete` | ❌ (ตามเก็บทีหลังใน `82b3790`) |
| `b5c6e7a` | เพิ่ม **`users.role_id`** | ❌ ไม่เคยมี |
| `ccdc32d` | เพิ่ม **`permissions.menu_id`** + **ลบ model `menus_permissions`** (เปลี่ยน M2M join table → FK ตรง) | ❌ ไม่เคยมี |

ตรงกับที่ Prisma ฟ้องเป๊ะ — ยืนยันกับ DB จริงแล้ว: `users.role_id` เป็น `varchar(100)`, `permissions.menu_id` เป็น `uuid` มีอยู่จริงทั้งคู่ ส่วน `menus_permissions` กลับกัน คือ migration `20260220163341` สั่งสร้าง แต่ **DB ไม่มี** เพราะ `ccdc32d` ลบทิ้งแล้ว push ทับ

#### ผลกระทบที่ใหญ่กว่าตัว drift
DB มี 20 ตาราง แต่ `schema.prisma` มี 25 model — **ที่ขาดคือของ Phase 1 และ 2a ทั้งหมด**:
- ❌ `report_files`, `report_queries`, `report_query_versions`, `report_variables`, `report_permissions`
- ❌ `reports.search_vector` + `reports_search_vector_idx` + trgm index ทั้ง 3 + `reports_department_id_idx` + `reports_status_category_id_idx` (มีแค่ index ชุด init เดิม 6 ตัว)
- ❌ `reports.output_type`, `users.theme_preference`

⇒ **Phase 1, 2b, 2c, 2d, 3a รันกับ DB นี้ไม่ได้เลย** ซึ่งขัดกับที่ phase plan บันทึกว่าทำ Verification list ครบแล้ว — ต้องถือว่า Verification ของเฟสเหล่านั้น **ยังไม่ได้ทำจริง** และต้องทำใหม่หลังแก้ DB

ตรวจแล้วว่าไม่ใช่เรื่องต่อผิดฐาน: `.env` กับ `.env.local` ชี้ `postgresql://postgres@localhost:5434/next_rfs_master` เหมือนกันเป๊ะ และบนเซิร์ฟเวอร์มีแค่ `bd_init_db`, `neko_neko_master`, `next_rfs_master`, `postgres` — ไม่มี DB สำรองของ RFS

#### ทางแก้ — เลือก 1 ใน 2

> **อัปเดต 2026-08-17:** พบว่า DB ปัจจุบัน (`nextjs_rfs`@`5432`, เปลี่ยนมาจาก `.env` นอกรอบ conversation) ถูกทำ **ทางแก้ B ไปแล้ว** ก่อนหน้า session ที่ทำ 3e — `_prisma_migrations` มี `applied_steps_count=0` ทั้ง 4 แถวของ DB เดิม ยืนยันว่าถูก `migrate resolve --applied` มา ไม่ใช่ apply จริง **แต่ไม่มีใครบันทึกว่าทำ/ทำเมื่อไหร่/ใครทำ** — ของค้างที่เหลือคือเอกสารตามหลังความจริงไม่ทัน ไม่ใช่ต้องเลือกทางแก้ใหม่แล้ว (ทาง A `migrate reset` **ไม่ควรทำแล้วตอนนี้** เพราะจะลบข้อมูลบน DB ที่ถูกใช้งานจริงอยู่)

**A. `migrate reset` + reseed** — ข้อมูลใน DB มีแค่ **users 4 / reports 3 / activity_logs 7** ซึ่ง seed กลับได้หมด ได้ ledger ที่ถูกต้องตั้งแต่ต้น ⚠️ ต้องเปิด comment `initSeed`/`rolesSeed`/`seedUsers` ใน `prisma/seed.ts` `main()` ก่อน ไม่งั้นได้ DB ที่ไม่มี user — **ตกไปแล้วสำหรับ DB ปัจจุบัน** เพราะ B ถูกเลือกไปแล้วโดยพฤตินัย

**B. เก็บข้อมูลเดิม** — รัน SQL template แล้ว `migrate resolve --applied` ทั้ง 4 ตัว ⚠️ วิธีนี้จะกลบความจริงเรื่อง `menus_permissions` ไว้ในประวัติ — **นี่คือสิ่งที่เกิดขึ้นจริงกับ `nextjs_rfs`** (ยืนยันจาก `applied_steps_count=0`) แม้ไม่มีบันทึกอย่างเป็นทางการ

📄 **SQL template พร้อมใช้:** [`prisma/manual/2026-08-17_reconcile-drift.template.sql`](../prisma/manual/2026-08-17_reconcile-drift.template.sql) — แจกแจงครบว่า **เพิ่ม** อะไร (3 enum, 2 คอลัมน์, 5 ตาราง, 10 index, 5 FK) **ลด** อะไร (ไม่มีเลย) **แก้** อะไร (`search_vector` ต้องเป็น generated column) พร้อมขั้นตอนของทั้งทาง A และ B

> ⚠️ ไฟล์ template วางไว้ที่ `prisma/manual/` ไม่ใช่ `prisma/migrations/` เพื่อไม่ให้ Prisma หยิบไปรันเอง
>
> ⚠️ `migrate diff` ที่ Prisma generate ให้ **ตกไป 5 รายการ** ที่ schema แทนไม่ได้ (extension `pg_trgm`/`unaccent`, generated column `search_vector`, GIN index, trgm index, partial unique `report_queries_one_main_per_report`) — template เติมมือให้แล้ว **อย่าใช้ output ดิบจาก `migrate diff` ตรง ๆ** จะได้ search ที่พังเงียบ ๆ

> 📌 **ข้อสันนิษฐานเดิมตกไปแล้ว:** `phase3-plan.md` เขียนว่าสงสัยไฟล์ `app/api/auth/login/route.ts` / `lib/redis.ts` ที่ modified ค้าง เป็นต้นเหตุ — ไม่เกี่ยวเลย ไฟล์พวกนั้นไม่แตะ schema และ commit ไปแล้วใน `a9e9a27`

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
