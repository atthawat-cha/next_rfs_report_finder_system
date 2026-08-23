-- DropIndex
DROP INDEX "report_variables_report_id_name_key";

-- AlterTable
ALTER TABLE "report_queries" ADD COLUMN     "sub_report_id" TEXT;

-- AlterTable
ALTER TABLE "report_variables" ADD COLUMN     "sub_report_id" TEXT;

-- CreateIndex
CREATE INDEX "report_queries_sub_report_id_idx" ON "report_queries"("sub_report_id");

-- CreateIndex
CREATE INDEX "report_variables_sub_report_id_idx" ON "report_variables"("sub_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_variables_report_id_sub_report_id_name_key" ON "report_variables"("report_id", "sub_report_id", "name");

-- AddForeignKey
ALTER TABLE "report_queries" ADD CONSTRAINT "report_queries_sub_report_id_fkey" FOREIGN KEY ("sub_report_id") REFERENCES "report_sub_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_variables" ADD CONSTRAINT "report_variables_sub_report_id_fkey" FOREIGN KEY ("sub_report_id") REFERENCES "report_sub_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make the existing "one is_main=true per report" partial unique index container-aware: a query's
-- container is either the main report itself (sub_report_id IS NULL) or one specific sub-report
-- (sub_report_id IS NOT NULL) - see prisma/schema.prisma's report_queries comment and
-- document/phase10-plan.md's Revision v2. A single index on (report_id, sub_report_id) WHERE
-- is_main would NOT work here: Postgres never considers two NULLs equal in a unique index, so rows
-- with sub_report_id IS NULL would never collide with each other and the "one main per report"
-- guarantee would silently stop being enforced for main-report-level queries.
DROP INDEX "report_queries_one_main_per_report";

CREATE UNIQUE INDEX "report_queries_one_main_per_report"
  ON "report_queries" ("report_id") WHERE "is_main" = true AND "sub_report_id" IS NULL;

CREATE UNIQUE INDEX "report_queries_one_main_per_subreport"
  ON "report_queries" ("report_id", "sub_report_id") WHERE "is_main" = true AND "sub_report_id" IS NOT NULL;
