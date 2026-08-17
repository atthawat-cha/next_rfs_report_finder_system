-- =====================================================================
--  TEMPLATE — ยังไม่ใช่ migration ที่รันได้ทันที ต้องรีวิว/แก้ก่อน
-- =====================================================================
--  วัตถุประสงค์: ปรับ DB `next_rfs_master` (localhost:5434) ให้ตรงกับ
--  `prisma/schema.prisma` ปัจจุบัน โดยไม่ต้อง `prisma migrate reset`
--
--  ⚠️ ไฟล์นี้จงใจวางไว้ที่ `prisma/manual/` ไม่ใช่ `prisma/migrations/`
--     เพื่อไม่ให้ Prisma หยิบไปรันเอง — ต้องรันมือหรือย้ายเข้า migrations
--     ด้วยตัวเองหลังรีวิวเสร็จ
--
--  ที่มา: `npx prisma migrate diff --from-config-datasource
--          --to-schema prisma/schema.prisma --script` (2026-08-17)
--         + เติมมือ 5 รายการที่ Prisma แทนใน schema ไม่ได้ (ดู §4)
--
--  บริบทเต็ม: document/00-progress.md → "🚧 ของค้าง #1"
-- =====================================================================


-- =====================================================================
--  §0. อ่านก่อนรัน — เลือกทางก่อน
-- =====================================================================
--
--  DB นี้ **ไม่มีตาราง `_prisma_migrations` เลย** (ไม่ใช่ว่ามีแล้วไม่ตรง)
--  แปลว่าถูกสร้างด้วย `prisma db push` ล้วน ๆ ไม่เคยรัน migrate สักครั้ง
--  ตอนนี้ DB ค้างอยู่ที่สภาพประมาณ ก.พ. 2026 (หลัง commit ccdc32d)
--
--  ทางเลือก A — reset + reseed  ⭐ แนะนำ
--    ข้อมูลใน DB มีแค่ users 4 / reports 3 / activity_logs 7 ซึ่ง seed
--    กลับได้หมด → `npx prisma migrate reset` แล้ว seed ใหม่ สะอาดที่สุด
--    และได้ `_prisma_migrations` ที่ถูกต้องตั้งแต่ต้น
--    ⚠️ ก่อน reset ต้องเปิด comment ใน `prisma/seed.ts` main() กลับก่อน:
--       initSeed / rolesSeed / seedUsers ถูก comment ไว้อยู่
--       ถ้าไม่เปิด จะได้ DB ที่ไม่มี user เลย ล็อกอินไม่ได้
--    ⚠️ ถ้าเลือกทาง A **ไม่ต้องใช้ไฟล์นี้เลย** — migration ทั้ง 4 ตัวที่มี
--       อยู่แล้วจะถูก apply ตามลำดับเอง
--
--  ทางเลือก B — เก็บข้อมูลเดิมไว้ (ไฟล์นี้คือทาง B)
--    1. รัน §1-§4 ของไฟล์นี้กับ DB
--    2. baseline migration ledger ให้ Prisma เชื่อว่า 4 ตัวเดิม apply แล้ว:
--         npx prisma migrate resolve --applied 20260214094853_init
--         npx prisma migrate resolve --applied 20260220163341
--         npx prisma migrate resolve --applied 20260813131434_add_report_search
--         npx prisma migrate resolve --applied 20260813144536_report_files_queries_variables_permissions
--       (คำสั่งนี้จะสร้าง `_prisma_migrations` ให้เอง — แค่บันทึก ไม่รัน SQL)
--    3. ตรวจ `npx prisma migrate status` ต้องขึ้น "Database schema is up to date!"
--    ⚠️ ข้อควรระวังของทาง B: migration `20260220163341` สั่ง CREATE TABLE
--       `menus_permissions` ซึ่ง **DB ไม่มีและ schema ก็ไม่มีแล้ว** (ถูกลบใน
--       ccdc32d ตอนเปลี่ยนจาก M2M เป็น FK ตรง `permissions.menu_id`)
--       การ resolve --applied จะกลบความจริงข้อนี้ไว้ ถ้าวันหนึ่งมีคนรัน
--       migrate deploy กับ DB เปล่า จะได้ตารางที่ไม่มีใครใช้โผล่มา
--       → ทาง A ไม่มีปัญหานี้


-- =====================================================================
--  §1. ADD — ENUM ใหม่ 3 ตัว
-- =====================================================================
CREATE TYPE "ReportOutputType" AS ENUM ('PRINT_FORM', 'DATA_REPORT');
CREATE TYPE "FileKind" AS ENUM ('BLANK_FORM', 'SAMPLE_FILLED_FORM', 'SAMPLE_DATA');
CREATE TYPE "SubjectType" AS ENUM ('USER', 'ROLE');


-- =====================================================================
--  §2. ADD — คอลัมน์ใหม่บนตารางเดิม
-- =====================================================================
-- reports.output_type — Phase 2a (แยกใบพิมพ์ / รายงานข้อมูล)
ALTER TABLE "reports" ADD COLUMN "output_type" "ReportOutputType" NOT NULL DEFAULT 'DATA_REPORT';

-- users.theme_preference — Phase 3e (ค่า 'light' | 'dark' | 'system', null = ยังไม่เคยตั้ง)
ALTER TABLE "users" ADD COLUMN "theme_preference" TEXT;

-- ⚠️ reports.search_vector — ดู §4.1 ด้านล่าง **อย่าใช้บรรทัดที่ Prisma
--    generate มา** (`ADD COLUMN "search_vector" tsvector;`) เพราะมันสร้าง
--    คอลัมน์เปล่า ไม่ใช่ generated column → search จะพังเงียบ ๆ


-- =====================================================================
--  §3. ADD — ตารางใหม่ 5 ตัว (Phase 2a ทั้งชุด)
-- =====================================================================
CREATE TABLE "report_files" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "file_kind" "FileKind" NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_queries" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sql_text" TEXT NOT NULL,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "report_queries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_query_versions" (
    "id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sql_text" TEXT NOT NULL,
    "change_log" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_query_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_variables" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "data_type" TEXT NOT NULL,
    "default_value" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "report_variables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_permissions" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "subject_type" "SubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_favorite" BOOLEAN NOT NULL DEFAULT false,
    "can_export" BOOLEAN NOT NULL DEFAULT false,
    "can_print" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "report_permissions_pkey" PRIMARY KEY ("id")
);

-- Index + FK ของตารางใหม่
CREATE INDEX "report_files_report_id_file_kind_idx" ON "report_files"("report_id", "file_kind");
CREATE INDEX "report_queries_report_id_idx" ON "report_queries"("report_id");
CREATE UNIQUE INDEX "report_variables_report_id_name_key" ON "report_variables"("report_id", "name");
CREATE INDEX "report_permissions_subject_type_subject_id_idx" ON "report_permissions"("subject_type", "subject_id");
CREATE UNIQUE INDEX "report_permissions_report_id_subject_type_subject_id_key" ON "report_permissions"("report_id", "subject_type", "subject_id");

ALTER TABLE "report_files" ADD CONSTRAINT "report_files_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_queries" ADD CONSTRAINT "report_queries_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_query_versions" ADD CONSTRAINT "report_query_versions_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "report_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_variables" ADD CONSTRAINT "report_variables_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_permissions" ADD CONSTRAINT "report_permissions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- =====================================================================
--  §4. เติมมือ — 5 รายการที่ `migrate diff` ตกไป
--      เพราะ schema.prisma แทนสิ่งเหล่านี้ไม่ได้
--      (คัดลอกมาจาก migrations/20260813131434_add_report_search
--       และ 20260813144536_..._permissions ซึ่งเป็นของจริง)
-- =====================================================================

-- §4.1 extension ที่ full-text search ต้องใช้
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- §4.2 reports.search_vector — ต้องเป็น GENERATED column
--      Prisma เก็บเป็น Unsupported("tsvector") จึง generate ได้แค่คอลัมน์เปล่า
ALTER TABLE "reports" DROP COLUMN IF EXISTS "search_vector";
ALTER TABLE "reports" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("name_th", '') || ' ' || coalesce("name_en", '') || ' ' || coalesce("description", '') || ' ' || coalesce("code", ''))
  ) STORED;

-- §4.3 GIN index บน search_vector
CREATE INDEX IF NOT EXISTS "reports_search_vector_idx" ON "reports" USING GIN ("search_vector");

-- §4.4 trigram index สำหรับค้นภาษาไทย (tsvector 'simple' ตัดคำไทยไม่ได้)
CREATE INDEX IF NOT EXISTS "reports_name_th_trgm_idx" ON "reports" USING GIN ("name_th" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "reports_name_en_trgm_idx" ON "reports" USING GIN ("name_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "reports_code_trgm_idx" ON "reports" USING GIN ("code" gin_trgm_ops);

-- §4.5 partial unique index — บังคับ "1 รายงานมีคิวรี่หลักได้ 1 ตัว"
--      Prisma แทน partial index (WHERE ...) ใน schema ไม่ได้
CREATE UNIQUE INDEX "report_queries_one_main_per_report"
  ON "report_queries" ("report_id") WHERE "is_main" = true;

-- index ธรรมดาบน reports ที่ Phase 1 เพิ่ม (diff จับได้ แต่รวมไว้ตรงนี้ให้ครบชุด)
CREATE INDEX IF NOT EXISTS "reports_department_id_idx" ON "reports"("department_id");
CREATE INDEX IF NOT EXISTS "reports_status_category_id_idx" ON "reports"("status", "category_id");


-- =====================================================================
--  §5. DROP — ไม่มี
-- =====================================================================
--  ตรวจแล้ว DB ไม่มีอะไรเกินจาก schema เลย (`migrate diff` ไม่ออก DROP
--  สักบรรทัด) โดยเฉพาะ:
--    · `menus_permissions` — DB **ไม่มี** อยู่แล้ว (ถูก db push ทิ้งไปตอน
--      ccdc32d) แม้ migration 20260220163341 จะสั่งสร้างก็ตาม
--    · `report_versions` — ยังมีทั้งใน DB และ schema เป็น dead code
--      (ถูกแทนด้วย report_files.is_current + report_query_versions)
--      **จงใจไม่ drop** รอ sign-off — ดู 00-progress.md ของค้าง #3


-- =====================================================================
--  §6. ตรวจหลังรัน
-- =====================================================================
--  · ตารางต้องครบ 25 (เดิม 20) — report_files, report_queries,
--    report_query_versions, report_variables, report_permissions เพิ่มมา
--  · SELECT count(*) FROM pg_indexes WHERE tablename='reports';
--    ต้องมี reports_search_vector_idx + trgm 3 ตัว + department/status_category
--  · ค้นรายงานด้วยคำไทยกลางคำ → ต้องเจอ (พิสูจน์ว่า trgm ทำงาน)
--  · npx prisma migrate status → "Database schema is up to date!"
--  · npx prisma generate แล้วเปิดหน้าแก้ไขรายงาน → ส่วนไฟล์/คิวรี่/สิทธิ์
--    ต้องโหลดได้ ไม่ 500
