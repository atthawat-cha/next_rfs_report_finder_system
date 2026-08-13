# Phase 2 — โครงสร้างข้อมูลรายงานให้ครบตามโจทย์แอดมิน

## Context

Phase 0 (`5809f5f`) และ Phase 1 (`7a099b8`) ปิดจบแล้ว เข้า Phase 2 ตาม `project-specification.md §6` ซึ่งมีรายละเอียด schema/design เขียนไว้ครบแล้วใน `01-system-design.md §3.5, §3.9, §5.2-5.4` — Phase 2 ส่วนใหญ่คือ implement ตาม design ที่มีอยู่ ไม่ใช่ออกแบบใหม่

Audit โค้ดจริงพบว่า:
- **ไม่มีหน้าแก้ไขรายงานเลย** ไม่มี route ใต้ `app/(auth)/reports/` สำหรับ edit
- `app/api/reports/report/manage/[id]/route.ts` และ `.../modify/route.ts` เป็น **stub ค้างไว้** (`{message:"Hello World"}` ทั้งคู่) — ต้อง reconcile ว่าจะใช้ตัวไหนเป็นตัวจริงก่อนขยาย ไม่ขยายพร้อมกันสองที่
- 4 ตารางใหม่ (`report_files`, `report_queries`+`report_query_versions`, `report_variables`, `report_permissions`) และ 3 enum ใหม่ (`ReportOutputType`, `FileKind`, `SubjectType`) ยังไม่มีใน schema เลย — ของใหม่ทั้งก้อน
- Phase 1 สร้าง `lib/report-visibility.ts` (coarse rule: `PUBLIC`+`PUBLISHED` เท่านั้น) ไว้ใช้ชั่วคราวจนกว่าจะมี ACL เต็มรูปแบบ — Phase 2 ต้องแทนที่ทุกจุดที่เรียกมันด้วย `lib/report-acl.ts`

Resolved decisions (ยืนยันจากผู้ใช้):
1. แบ่งเป็น 4 sub-phase ทำทีละก้อน แทนเขียนแผนเดียวยาวทั้ง Phase 2:
   - **2a**: Schema (4 ตารางใหม่ + `output_type`) + `lib/report-acl.ts` (หัวใจของ phase — endpoint อื่นในทุก sub-phase ถัดไปเรียกใช้ตัวนี้)
   - **2b**: `report_files` CRUD + หน้าแก้ไขรายงาน (reconcile `[id]`/`modify` stub) + สลับ Phase 1 endpoints (browse/favorites/download) จาก `lib/report-visibility.ts` → `lib/report-acl.ts`
   - **2c**: `report_queries` (+versions, partial unique index) + `report_variables` CRUD
   - **2d**: `report_permissions` CRUD + หน้า permission editor (matrix ผู้ใช้/บทบาท × action)
2. `reports.file_path/file_name/file_type/file_size` เดิม เก็บไว้เป็น **cache ชั่วคราว** sync จาก `report_files WHERE is_current=true` (ไม่ migrate ออกทันที) — ต้อง sync ให้ตรงกันทุกครั้งที่ `report_files` เปลี่ยน `is_current`, และ migrate ทิ้งเมื่อ call site ทั้งหมดย้ายไปอ่านจาก `report_files` แล้วเท่านั้น (ตัดสินใจ deferred ไป Phase 3+ ตามที่ design doc แนะนำ ไม่ทิ้งไว้เฉยๆไม่มีกำหนด)

เอกสารนี้ครอบคลุมเฉพาะ **sub-phase 2a** แบบละเอียดพร้อม implement — 2b/2c/2d จะเขียนละเอียดตอนถึงตาแต่ละก้อน (เนื้อหาคร่าวๆอยู่ท้ายไฟล์)

---

## Sub-phase 2a — Schema + `lib/report-acl.ts`

### 1. Schema migration

เพิ่มตามที่ระบุใน `system-design.md §5.3` เป๊ะๆ (คัดลอกมาจาก doc, ไม่ปรับ):

```prisma
enum ReportOutputType {
  PRINT_FORM
  DATA_REPORT
}

enum FileKind {
  BLANK_FORM
  SAMPLE_FILLED_FORM
  SAMPLE_DATA
}

enum SubjectType {
  USER
  ROLE
}

model report_files {
  id          String    @id
  report_id   String
  file_kind   FileKind
  file_path   String
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

model report_queries {
  id             String   @id
  report_id      String
  name           String
  sql_text       String
  is_main        Boolean  @default(false)
  version        String   @default("1.0")
  created_by     String
  created_at     DateTime @default(now())
  updated_at     DateTime
  reports        reports  @relation(fields: [report_id], references: [id], onDelete: Cascade)
  report_query_versions report_query_versions[]

  @@index([report_id])
}

model report_query_versions {
  id             String         @id
  query_id       String
  version        String
  sql_text       String
  change_log     String?
  created_by     String
  created_at     DateTime       @default(now())
  report_queries report_queries @relation(fields: [query_id], references: [id], onDelete: Cascade)
}

model report_variables {
  id            String   @id
  report_id     String
  name          String
  label         String?
  data_type     String
  default_value String?
  is_required   Boolean  @default(false)
  sort_order    Int      @default(0)
  reports       reports  @relation(fields: [report_id], references: [id], onDelete: Cascade)

  @@unique([report_id, name])
}

model report_permissions {
  id           String      @id
  report_id    String
  subject_type SubjectType
  subject_id   String
  can_view     Boolean     @default(false)
  can_edit     Boolean     @default(false)
  can_delete   Boolean     @default(false)
  can_favorite Boolean     @default(false)
  can_export   Boolean     @default(false)
  can_print    Boolean     @default(false)
  created_at   DateTime    @default(now())
  updated_at   DateTime
  reports      reports     @relation(fields: [report_id], references: [id], onDelete: Cascade)

  @@unique([report_id, subject_type, subject_id])
  @@index([subject_type, subject_id])
}
```

บน `reports`: เพิ่ม `output_type ReportOutputType @default(DATA_REPORT)` — เดาว่า `DATA_REPORT` เป็นค่าที่เหมาะกับ default มากกว่า เพราะรายงานที่มีอยู่ 5 แถวใน dev ทั้งหมดใกล้เคียง data report มากกว่า print form (ยืนยันตอน implement จริงถ้าจำเป็น) รวม relation ใหม่ 4 ตัว (`report_files`, `report_queries`, `report_variables`, `report_permissions`)

**Partial unique index** ("1 main query ต่อรายงาน") ทำไม่ได้ผ่าน Prisma schema DSL ตรงๆ — ต้องเพิ่มเป็น raw SQL ในไฟล์ migration:
```sql
CREATE UNIQUE INDEX report_queries_one_main_per_report
  ON report_queries (report_id) WHERE is_main = true;
```

**ขั้นตอน migration** (เรียนจาก Phase 1: DB dev ใช้ `db push` มาตลอด ไม่ใช่ `migrate dev` — ต้องเช็ค `prisma migrate status` ก่อนเสมอ ถ้ามี drift ใหม่เกิดขึ้นอีกให้ baseline ก่อน ห้าม `migrate reset`):
1. เพิ่ม schema ตามข้างบน
2. `npx prisma db push` (sync คอลัมน์/ตารางธรรมดาเข้า dev DB)
3. รัน partial unique index ด้วย raw SQL (`prisma db execute --file`)
4. เขียน `migration.sql` ที่ตรงกับ SQL จริงที่รันไปแล้ว ใส่ใน `prisma/migrations/<timestamp>_report_files_queries_variables_permissions/`
5. `prisma migrate resolve --applied <migration>` เพื่อให้ history sync
6. `npx prisma generate`

### 2. `lib/report-acl.ts` — ACL resolver กลาง

ตาม `system-design.md §3.5` resolution order (specific-most ชนะ):
```ts
export interface ReportAclFlags {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_favorite: boolean;
  can_export: boolean;
  can_print: boolean;
}

export async function resolveReportAcl(reportId: string, user: UserSessionType): Promise<ReportAclFlags> {
  // 1. individual grant (report_id, user_id)
  const individual = await prisma.report_permissions.findUnique({
    where: { report_id_subject_type_subject_id: { report_id: reportId, subject_type: 'USER', subject_id: user.id } },
  });
  if (individual) return toFlags(individual);

  // 2. role grant (report_id, role_id)
  if (user.roles?.id) {
    const roleGrant = await prisma.report_permissions.findUnique({
      where: { report_id_subject_type_subject_id: { report_id: reportId, subject_type: 'ROLE', subject_id: user.roles.id } },
    });
    if (roleGrant) return toFlags(roleGrant);
  }

  // 3. fallback: access_level (PUBLIC → view-only for everyone; RESTRICTED/PRIVATE → default-deny)
  const report = await prisma.reports.findUnique({ where: { id: reportId }, select: { access_level: true, status: true } });
  if (report?.status === 'PUBLISHED' && report.access_level === 'PUBLIC') {
    return { can_view: true, can_edit: false, can_delete: false, can_favorite: true, can_export: true, can_print: true };
  }
  return { can_view: false, can_edit: false, can_delete: false, can_favorite: false, can_export: false, can_print: false };
}

/** List-endpoint variant: candidate report IDs a user can view, for a WHERE-level filter (never post-fetch). */
export async function visibleReportIdsFor(user: UserSessionType): Promise<string[] | 'ALL'> { ... }
```

`visibleReportIdsFor` คือจุดที่ต้อง design เพิ่ม (design doc พูดถึงแค่แนวทาง ไม่ได้ให้ signature ชัด) — สำหรับ Phase 2a เขียนเป็น query เดียวที่รวม 3 กรณี (individual view grant, role view grant, PUBLIC+PUBLISHED fallback) ด้วย `UNION` ผ่าน `$queryRaw`, คืน array ของ report id เพื่อให้ browse/favorites/download ใช้ `WHERE id IN (...)` — ตาม principle ที่ design doc ย้ำว่าต้อง filter ที่ query level ไม่ใช่ post-fetch

**Admin bypass**: `routeAcceptted('admin')` (admin/super_admin) ข้าม ACL นี้ทั้งหมดตามที่ design doc ระบุไว้ชัด (§3.5 ข้อสุดท้าย) — `resolveReportAcl`/`visibleReportIdsFor` ไม่ต้องรับ role พิเศษสำหรับ admin เพราะ endpoint จะเช็ค role ก่อนเรียกฟังก์ชันนี้อยู่แล้ว (เหมือน pattern เดิมที่ `manage` route ทำ)

**หมายเหตุสำคัญ**: sub-phase นี้ **แค่สร้าง** `lib/report-acl.ts` ไม่ได้ไปแก้ endpoint ของ Phase 1 (browse/favorites/download) ให้เรียกมันแทน — นั่นคืองานของ **2b** (ตามที่ design doc บอกว่า `lib/report-acl.ts` "เรียกจากทุก endpoint ที่แตะรายงาน" ก็จริง แต่การสลับ Phase 1 เอนด์พอยต์เป็นงานที่เกี่ยวโยงกับหน้าแก้ไขรายงานและควรทำพร้อมกันใน 2b เพื่อ diff เดียว)

**Files**: `prisma/schema.prisma`, migration ใหม่, `lib/report-acl.ts` (ใหม่)

### Verification (2a)

- `npx prisma migrate status` ต้อง "up to date" หลัง resolve
- Insert แถว `report_permissions` ตัวอย่าง (individual + role) ผ่าน `npx prisma studio` หรือ script → เรียก `resolveReportAcl` ตรงๆ ผ่าน node/tsx script ยืนยัน resolution order ถูกต้องทั้ง 3 กรณี (individual ชนะ role, role ชนะ fallback, ไม่มีอะไรเลย → default-deny สำหรับ non-PUBLIC)
- Insert `report_queries` 2 แถวที่ `is_main=true` ในรายงานเดียวกันตรงๆผ่าน SQL → ต้องโดน unique constraint ปฏิเสธแถวที่สอง
- `npx tsc --noEmit` ไม่มี error ใหม่

---

## Sub-phase 2b

Audit เพิ่มก่อนลงรายละเอียด พบ 2 เรื่องที่ overview เดิมไม่ครอบคลุม:
- `app/api/reports/report/manage/modify/route.ts` **ไม่มี frontend เรียกเลย** (grep ทั้ง `app/` ไม่เจอ) — dead stub แน่นอน ลบทิ้ง ใช้ `[id]/route.ts` เป็นตัวจริงแทน
- Pipeline อัปโหลดปัจจุบัน (`lib/fileUploadServices.ts`) เป็น **image-only ล้วน** — บังคับ jpg/png/webp + convert เป็น WebP เสมอ (`convertToWebp`) แต่ `report_files` ต้องรับ PDF (`BLANK_FORM`/`SAMPLE_FILLED_FORM`) และ Excel (`SAMPLE_DATA`) ซึ่งไม่ใช่รูป ต้องมี upload service ใหม่แยกที่ไม่ผ่าน image conversion

Resolved decisions (ยืนยันจากผู้ใช้):
1. Cache priority เมื่อรายงานมีไฟล์ current หลาย kind พร้อมกัน: ลำดับคงที่ตาม `output_type` — `PRINT_FORM` ใช้ `BLANK_FORM` เป็น primary, `DATA_REPORT` ใช้ `SAMPLE_DATA` เป็น primary (ไม่ใช่ "ล่าสุด" เพราะจะสลับไม่แน่นอนไม่ผูกกับ session)
2. หน้าแก้ไขรายงานแยกเป็นเพจใหม่ `app/(auth)/reports/report-edit/[id]/page.tsx` (ไม่รวมเข้า `report-create`)

### 1. `lib/reportFileUploadServices.ts` (ใหม่) — non-image upload

Validate ตาม `file_kind`:
- `BLANK_FORM`, `SAMPLE_FILLED_FORM` → เฉพาะ `.pdf` (`application/pdf`)
- `SAMPLE_DATA` → `.xlsx`/`.xls`/`.csv`

บันทึกไฟล์ตรงลง `public/assest/report-files/` (ไม่ convert อะไรทั้งสิ้น ไม่มี thumbnail) คืน `{filePath, fileName, fileType, fileSize}` เหมือน shape ของ `fileUploadServices.ts` เดิมเพื่อให้ route handler เรียกใช้แบบเดียวกัน

**Files**: `lib/reportFileUploadServices.ts` (ใหม่)

### 2. `report_files` CRUD + versioning

`GET/POST/PUT/DELETE /api/reports/[id]/files`:
- `POST`: validate `file_kind` ตรงกับ `output_type` ของรายงาน (`PRINT_FORM` รับ `BLANK_FORM`/`SAMPLE_FILLED_FORM` เท่านั้น, `DATA_REPORT` รับ `SAMPLE_DATA` เท่านั้น — 400 ถ้าไม่ตรง) → ถ้ามีไฟล์ `is_current=true` ของ `file_kind` เดียวกันอยู่แล้ว ตั้ง `is_current=false` ให้แถวเก่า (versioning แบบง่าย ไม่มี diff/rollback ใน Phase 2 — รอ Phase 3) → insert แถวใหม่ `is_current=true`, bump `version` (`parseFloat` + 0.1 หรือ scheme ง่ายๆ) → sync cache (ข้อ 4) → `logActivity('update'/'report')`
- `DELETE`: soft-check ก่อนว่าไม่ใช่ไฟล์ current ตัวสุดท้ายของ kind ที่ `output_type` บังคับต้องมี (กัน report เหลือ 0 ไฟล์ที่จำเป็น) — ตัดสินใจ MVP: อนุญาตลบได้เสมอ ถ้าลบ current แล้วไม่มีไฟล์ทดแทน ให้ report นั้นแสดง "ไม่มีไฟล์" ในหน้า preview/download (ไม่ block การลบ)
- Auth: `routeAcceptted('admin')` เท่านั้น (การจัดการไฟล์ของรายงานเป็นงาน admin)

**Files**: `app/api/reports/[id]/files/route.ts` (ใหม่)

### 3. Reconcile `[id]`/`modify` stub

- ลบ `app/api/reports/report/manage/modify/` ทั้ง folder
- Implement `app/api/reports/report/manage/[id]/route.ts` จริง:
  - `GET`: single report + `report_files` (current เท่านั้น) + `categories`/`departments` สำหรับ preload หน้า edit
  - `PUT`: update metadata (code/name/description/category/department/status/access_level/output_type/is_downloadable/is_editable) — **ไม่แก้ไฟล์ที่นี่** (แยกไปที่ `/files` endpoint ข้อ 2) — `logActivity('update')`
  - `DELETE`: cascade ลบ `report_files`/`report_versions`/... ผ่าน `onDelete: Cascade` ที่มีอยู่แล้วใน schema — `logActivity('delete')`

**Files**: `app/api/reports/report/manage/[id]/route.ts` (rewrite), ลบ `app/api/reports/report/manage/modify/` ทั้ง folder

### 4. Sync `reports.file_path` cache

Helper กลาง `lib/report-file-cache.ts`: `syncReportFileCache(reportId)` — query `report_files WHERE report_id=X AND is_current=true`, เลือก primary ตาม `output_type` (ตัดสินใจแล้ว: `PRINT_FORM`→`BLANK_FORM`, `DATA_REPORT`→`SAMPLE_DATA`), แล้ว `prisma.reports.update` ให้ `file_path/file_name/file_type/file_size` ตรงกับไฟล์นั้น เรียกจากท้าย `POST`/`DELETE` ของ `/files` endpoint ทุกครั้งที่ `is_current` เปลี่ยน

**Files**: `lib/report-file-cache.ts` (ใหม่)

### 5. หน้าแก้ไขรายงาน — เพจใหม่

`app/(auth)/reports/report-edit/[id]/page.tsx`:
- Preload ผ่าน `GET /api/reports/report/manage/[id]`, form เดียวกับ `report-create` (metadata fields + `output_type` select ที่ **ต้องเพิ่มใน create form ด้วย** เพราะปัจจุบันไม่มี field นี้ในฟอร์มสร้างเลย — ทุกรายงานใหม่จะได้ default `DATA_REPORT` เงียบๆถ้าไม่เพิ่ม)
- ส่วนจัดการไฟล์แยกเป็น section ต่างหาก: list `report_files` ปัจจุบันตาม `file_kind` ที่ `output_type` กำหนด พร้อมปุ่ม "แทนที่ไฟล์" ต่อ kind (เรียก `POST /api/reports/[id]/files`)
- ปุ่ม "แก้ไขข้อมูล" ในตาราง `report-list`/`reportColumn.tsx` (ปัจจุบันไม่มี action นี้เลย นอกจาก Download/Add to Favorites ที่เพิ่งเพิ่มใน Phase 1) เพิ่ม link ไปหน้านี้

**Files**: `app/(auth)/reports/report-edit/[id]/page.tsx` (ใหม่), `app/(auth)/reports/report-create/page.tsx` (เพิ่ม `output_type` field), `.../report-list/components/reportColumn.tsx` (เพิ่มปุ่ม Edit ที่ link จริงแทนของเดิมที่ไม่มี onClick)

### 6. สลับ Phase 1 endpoints ไปใช้ `lib/report-acl.ts`

- `app/api/reports/browse/route.ts`: แทน `nonAdminVisibilityWhere` ด้วย `where.id = { in: await visibleReportIdsFor(user) }`
- `app/api/reports/favorites/route.ts` (POST): แทน `isReportVisibleToNonAdmin` ด้วย `(await resolveReportAcl(reportId, user)).can_favorite`
- `app/api/reports/[id]/download/route.ts`: แทน visibility check ด้วย `(await resolveReportAcl(reportId, user)).can_export` (ไม่ใช่ `can_view` — download คือ export ตาม flag ที่ออกแบบไว้)
- ลบ `lib/report-visibility.ts` ทิ้งหลังจากไม่มีจุดเรียกแล้ว (ยืนยันด้วย grep ก่อนลบ)

**Files**: `app/api/reports/browse/route.ts`, `app/api/reports/favorites/route.ts`, `app/api/reports/[id]/download/route.ts` (แก้ทั้งสาม), ลบ `lib/report-visibility.ts`

### Verification (2b)

- สร้างรายงานใหม่ `output_type=PRINT_FORM` → อัปโหลด `BLANK_FORM` (pdf) ผ่านหน้า edit → เห็นไฟล์จริงใน `report_files`, `reports.file_path` cache ตรงกับไฟล์นั้น
- อัปโหลด `SAMPLE_DATA` (xlsx) ให้รายงาน `output_type=PRINT_FORM` → ต้องถูกปฏิเสธ 400 (kind ไม่ตรง output_type)
- แทนที่ `BLANK_FORM` ด้วยไฟล์ใหม่ → แถวเก่า `is_current=false`, แถวใหม่ `is_current=true`, cache sync ตาม
- ลบ `[id]`/`modify` reconcile: `curl` ตรงไป `.../modify` → 404 (ลบ route แล้ว); `[id]` GET/PUT/DELETE ทำงานจริง
- `browse`/`favorites`/`download` ยังทำงานเหมือน Phase 1 ทุกอย่าง (regression check) + เพิ่ม test ใหม่: ให้ `report_permissions` grant สิทธิ์ดูรายงาน DRAFT แก่ user คนหนึ่ง → user นั้นเห็นในผลลัพธ์ `browse`, user อื่นไม่เห็น
- `npx tsc --noEmit` / `npm run build` ไม่มี error ใหม่

## Sub-phase 2c (overview)

- `report_queries` CRUD + `report_query_versions` (auto-snapshot เมื่อแก้ `sql_text`) + บังคับ `is_main` 1 อันต่อรายงานฝั่ง application (ก่อนชน DB constraint ให้ error message ที่อ่านง่าย)
- `report_variables` CRUD

## Sub-phase 2d (overview)

- `report_permissions` CRUD ต่อรายงาน
- หน้า permission editor: matrix ผู้ใช้/บทบาท × action (`can_view/can_edit/can_delete/can_favorite/can_export/can_print`) — คล้าย pattern ที่มีอยู่แล้วใน `role-management` (`components/shared/permissions-form.tsx`) ให้ดูเป็นตัวอย่าง
