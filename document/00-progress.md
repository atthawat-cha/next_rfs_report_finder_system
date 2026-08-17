# ความคืบหน้าโครงการ — RFS Report Finder System

> **อัปเดตล่าสุด:** 2026-08-17 · **Branch:** `feature/phase3` · **HEAD:** `2189693`
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

**เสร็จแล้ว:** Phase 0 → 3d ทั้งหมด (13 sub-phase) — ระบบใช้งานได้ครบวงจรแล้ว ตั้งแต่ค้นหา/ดาวน์โหลดฝั่งผู้ใช้ ไปจนถึง CRUD รายงาน + ไฟล์ + คิวรี่ + สิทธิ์รายรายงาน + version rollback + แชร์ + แจ้งเตือน + dashboard

**ค้างอยู่:** **Phase 3e** (persist ธีมต่อผู้ใช้) — 🚫 **blocked** ไม่ใช่เพราะงาน 3e เอง แต่เพราะเจอ **DB schema drift** ตอนจะรัน migration (ดู [ของค้าง #1](#1-db-schema-drift--บล็อก-phase-3e))

**งานถัดไปที่ควรทำ (เรียงตามลำดับ):**
1. **แก้ DB schema drift** → ปลดบล็อก 3e (งาน 3e เองเหลือแค่ ~3 ไฟล์ ทำเสร็จได้ในรอบเดียวถ้า migration ผ่าน)
2. **รีเฟรช `feature-list.md`** — ยังขึ้น ❌ ให้ Phase 1/2/3 ทั้งที่ ship แล้ว (ดู [ของค้าง #4](#4-feature-listmd-ค้าง))
3. **วางแผน Phase 4** — ยังไม่มี `phase4-plan.md` เลย ทั้งที่ `feature-list.md` อ้างถึง Phase 4 อยู่หลายสิบแถว

---

## 📋 ตารางความคืบหน้า

**สัญลักษณ์:** ✅ เสร็จ+commit แล้ว · 🚫 blocked · ❌ ยังไม่เริ่ม · 📝 มีแต่แผน ยังไม่มีโค้ด

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
| **3e** | Settings — persist ธีมต่อผู้ใช้ (`users.theme_preference`) | 🚫 **blocked** | แผน: `e2fc97e` |

**3e เหลืออะไรบ้าง** (แผนละเอียดพร้อมแล้ว รอปลดบล็อกอย่างเดียว):
- [ ] Migration `add_user_theme_preference` — ⚠️ `theme_preference String?` **อยู่ใน `prisma/schema.prisma:398` แล้ว แต่ยังไม่มี migration file** (schema ล้ำหน้า DB อยู่)
- [ ] `app/api/settings/theme/route.ts` (GET/PUT) — ยังไม่มีโฟลเดอร์ `app/api/settings/` เลย
- [ ] `components/layouts/theme-sync.tsx` (ใหม่) + แก้ `authenticationLayout.tsx` / `mode-toggle.tsx`

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

### 1. DB schema drift — บล็อก Phase 3e
**พบเมื่อ:** 2026-08-16 ตอนรัน `npx prisma migrate dev --name add_user_theme_preference`

DB (dev) กับ migration history **ไม่ตรงกัน** และไม่เกี่ยวกับงาน 3e เลย:
- `users.role_id` และ `permissions.menu_id` มีอยู่จริงใน DB แต่ไม่มี migration file รองรับ
- ตาราง `menus_permissions` และ index บางตัวของ `reports` ต่างจากที่ migration history บันทึกไว้

Prisma เสนอทางเดียวคือ `prisma migrate reset` ซึ่ง **ลบข้อมูลทั้งหมด** → ไม่ได้รัน DB และ migration files จึงไม่ถูกแตะต้อง

**ต้องทำก่อน resume 3e:** สร้าง migration ที่ backfill ประวัติให้ตรงกับ DB จริง **หรือ** ยืนยันกับเจ้าของงาน `role_id`/`menu_id` ว่าตั้งใจทำแบบนั้น — ⚠️ **อย่าเลี่ยงด้วย `db push`** เพราะจะทิ้ง drift เดิมไว้ไม่ถูกบันทึกต่อไป

> 📌 **หมายเหตุ:** `phase3-plan.md` เขียนว่าสงสัยไฟล์ `app/api/auth/login/route.ts` / `lib/redis.ts` ที่ "modified แต่ยังไม่ commit" เป็นต้นเหตุ — **ข้อสันนิษฐานนี้ตกไปแล้ว** ไฟล์เหล่านั้นถูก commit ไปแล้วใน `a9e9a27` และตอนนี้ working tree สะอาด (เหลือแค่ `package-lock.json`) drift ยังหาสาเหตุไม่เจอ

### 2. Baseline TypeScript errors — 6 ตัว (หนี้เก่า ไม่ใช่ของใหม่)
`npx tsc --noEmit` มี error ค้าง 6 ตัวมาตั้งแต่ก่อน Phase 1 (แก้ล่าสุด `f8d7598`) **ไม่เกี่ยวกับงาน reports/versions/shares/notifications** — เวลา type-check ให้เทียบกับ baseline นี้ แล้วรายงานเฉพาะ error **ใหม่** เท่านั้นว่าเป็นตัวบล็อก:

| ไฟล์ | ปัญหา |
|---|---|
| `app/api/auth/login/route.ts` | ไม่มี export `checkRateLimit`/`resetRateLimit` จาก `lib/auth` |
| `app/api/reports/[id]/download/route.ts` | `ActivityAction` ไม่มี `'download'` |
| `app/api/reports/favorites/[reportId]/route.ts` | `ActivityAction` ไม่มี `'unfavorite'` |
| `app/api/reports/favorites/route.ts` | `ActivityAction` ไม่มี `'favorite'` |
| `app/api/reports/report/manage/route.ts` | `UploadServiceResponse`/`MultipleUploadResult` shape ไม่ตรง + `file_size` string vs `number\|bigint` |
| `components/ui/combobox.tsx` | `"icon-xs"` ไม่ใช่ Button size ที่ถูกต้อง |

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
