-- Reconciles migration history with schema drift from Feb-Mar 2026 (commits
-- b5c6e7a "create user" and ccdc32d "add permission checkbox func") that was
-- applied to the dev DB via `prisma db push` and never captured in a
-- migration file, plus a set of full-text-search indexes that were silently
-- dropped along the way. Root-caused in document/00-progress.md ของค้าง #1:
-- every DB this project has run against since (including a fresh one set up
-- outside of any tracked migrate deploy) was built by pushing schema.prisma
-- directly rather than replaying migration history, so anything only
-- expressible as raw SQL inside a migration.sql - never mirrored in the
-- Prisma schema DSL - silently never landed.
--
-- Every statement below is guarded to be a no-op on a DB that already has
-- these changes (true for every environment this project currently runs
-- against) while still correctly bootstrapping a from-scratch `migrate
-- deploy` that has never seen a `db push`.

-- 1. `permissions.menu_id` / `users.role_id`: real, already-applied schema
--    changes (a direct FK replacing the `menus_permissions` M2M join table,
--    and a single role-per-user FK) that never got a matching migration.
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "menu_id" UUID;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_menu_id_fkey') THEN
    ALTER TABLE "permissions" ADD CONSTRAINT "permissions_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE;
  END IF;
END $$;
ALTER TABLE "permissions" ALTER COLUMN "menu_id" SET NOT NULL;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" VARCHAR(100);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_id_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;
ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

-- 2. `menus_permissions`: replaced by `permissions.menu_id` above in the same
--    drift window. Migration 20260220163341 still creates this table, so a
--    from-scratch `migrate deploy` would leave a phantom table no
--    application code references - drop it here so history matches reality.
DROP TABLE IF EXISTS "menus_permissions";

-- 3. Full-text search indexes from 20260813131434_add_report_search: that
--    migration's extension/column changes are expressible via
--    `Unsupported("tsvector")` in schema.prisma and so survived a
--    `db push`-based setup, but these GIN/trigram indexes are raw-SQL-only
--    and were silently skipped - search has been running an unindexed
--    sequential scan on every affected DB. This is a real perf fix, not
--    just paperwork.
CREATE INDEX IF NOT EXISTS "reports_search_vector_idx" ON "reports" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "reports_name_th_trgm_idx" ON "reports" USING GIN ("name_th" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "reports_name_en_trgm_idx" ON "reports" USING GIN ("name_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "reports_code_trgm_idx" ON "reports" USING GIN ("code" gin_trgm_ops);
