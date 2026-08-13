-- Phase 2a: report_files, report_queries(+versions), report_variables, report_permissions
-- See document/phase2-plan.md §Sub-phase 2a

-- CreateEnum
CREATE TYPE "ReportOutputType" AS ENUM ('PRINT_FORM', 'DATA_REPORT');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('BLANK_FORM', 'SAMPLE_FILLED_FORM', 'SAMPLE_DATA');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('USER', 'ROLE');

-- AlterTable
ALTER TABLE "reports" ADD COLUMN "output_type" "ReportOutputType" NOT NULL DEFAULT 'DATA_REPORT';

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX "report_files_report_id_file_kind_idx" ON "report_files"("report_id", "file_kind");

-- CreateIndex
CREATE INDEX "report_queries_report_id_idx" ON "report_queries"("report_id");

-- CreateIndex: at most one is_main=true query per report (Prisma DSL can't express partial indexes)
CREATE UNIQUE INDEX "report_queries_one_main_per_report"
  ON "report_queries" ("report_id") WHERE "is_main" = true;

-- CreateIndex
CREATE UNIQUE INDEX "report_variables_report_id_name_key" ON "report_variables"("report_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "report_permissions_report_id_subject_type_subject_id_key" ON "report_permissions"("report_id", "subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "report_permissions_subject_type_subject_id_idx" ON "report_permissions"("subject_type", "subject_id");

-- AddForeignKey
ALTER TABLE "report_files" ADD CONSTRAINT "report_files_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_queries" ADD CONSTRAINT "report_queries_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_query_versions" ADD CONSTRAINT "report_query_versions_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "report_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_variables" ADD CONSTRAINT "report_variables_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_permissions" ADD CONSTRAINT "report_permissions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
