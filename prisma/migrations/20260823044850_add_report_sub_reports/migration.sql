-- CreateEnum
CREATE TYPE "SubReportSlot" AS ENUM ('HEADER', 'DETAIL', 'FOOTER');

-- CreateEnum
CREATE TYPE "SubReportSourceType" AS ENUM ('UPLOAD', 'LINKED_REPORT');

-- AlterEnum
ALTER TYPE "FileKind" ADD VALUE 'REFERENCE_DOC';

-- CreateTable
CREATE TABLE "report_sub_reports" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" "SubReportSlot" NOT NULL DEFAULT 'DETAIL',
    "source_type" "SubReportSourceType" NOT NULL,
    "linked_report_id" TEXT,
    "file_path" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_size" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_sub_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_sub_reports_report_id_idx" ON "report_sub_reports"("report_id");

-- AddForeignKey
ALTER TABLE "report_sub_reports" ADD CONSTRAINT "report_sub_reports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_sub_reports" ADD CONSTRAINT "report_sub_reports_linked_report_id_fkey" FOREIGN KEY ("linked_report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
