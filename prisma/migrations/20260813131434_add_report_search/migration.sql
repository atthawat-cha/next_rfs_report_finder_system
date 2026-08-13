-- Phase 1: full-text search infrastructure for `reports`
-- See document/phase1-plan.md §2

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN IF EXISTS "search_vector";

ALTER TABLE "reports" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("name_th", '') || ' ' || coalesce("name_en", '') || ' ' || coalesce("description", '') || ' ' || coalesce("code", ''))
  ) STORED;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reports_search_vector_idx" ON "reports" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reports_department_id_idx" ON "reports" ("department_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reports_status_category_id_idx" ON "reports" ("status", "category_id");

-- Trigram indexes: `simple` tsvector tokenizes unsegmented Thai text (no spaces) as a single
-- lexeme per word, so prefix matching (`:*`) can't find a substring in the middle of a Thai
-- compound word. pg_trgm + ILIKE covers substring search for Thai; tsvector still handles
-- efficient whole-word/prefix matches for English.
CREATE INDEX IF NOT EXISTS "reports_name_th_trgm_idx" ON "reports" USING GIN ("name_th" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "reports_name_en_trgm_idx" ON "reports" USING GIN ("name_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "reports_code_trgm_idx" ON "reports" USING GIN ("code" gin_trgm_ops);
