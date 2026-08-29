import { FileText, FileSpreadsheet, File as FileIcon, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPdfFile, isSpreadsheetFile } from "@/components/shared/reportFilePreview";

/**
 * Small display helpers shared between report-list's table/card views and
 * favorites' table view (all four consume the same ReportGetDataType shape).
 * Kept out of lib/ deliberately - tailwind.config.ts's `content` globs only
 * scan components/**\/*.tsx and app/**\/*.tsx, not lib/**\/*.ts, so any
 * className strings living in lib/ risk being purged from the production build.
 */

export const REPORT_STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-success-bg text-success",
  DRAFT: "bg-warning-bg text-warning",
  ARCHIVED: "bg-archived-bg text-muted-foreground",
};

export function ReportStatusPill({ status, label, className }: { status: string; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        REPORT_STATUS_STYLES[status] ?? REPORT_STATUS_STYLES.ARCHIVED,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export interface FileKindMeta {
  ext: string;
  Icon: LucideIcon;
  badgeClassName: string;
}

export function fileKindMeta(file: { file_name?: string | null }): FileKindMeta {
  const ref = { file_name: file.file_name ?? "" };
  if (isPdfFile(ref)) {
    return { ext: "PDF", Icon: FileText, badgeClassName: "bg-pdf-bg text-pdf" };
  }
  if (isSpreadsheetFile(ref)) {
    return { ext: "XLSX", Icon: FileSpreadsheet, badgeClassName: "bg-xlsx-bg text-xlsx" };
  }
  const ext = file.file_name?.split(".").pop()?.toUpperCase() ?? "";
  return { ext: ext || "FILE", Icon: FileIcon, badgeClassName: "bg-muted text-muted-foreground" };
}

export function AccessLockIcon({ access, className, titleAccess }: { access: string; className?: string; titleAccess: string }) {
  if (access === "PUBLIC") return null;
  return (
    <Lock
      className={cn("h-3 w-3 shrink-0", access === "PRIVATE" ? "text-danger" : "text-warning", className)}
      aria-label={titleAccess}
    >
      <title>{titleAccess}</title>
    </Lock>
  );
}

/** Deterministic tint per category id - categories.icon/color exist in the
 * schema but are never populated through the admin UI (categoryFormDialog.tsx
 * doesn't expose them), so cycling a fixed palette by id hash gives folder
 * cards visual variety without depending on unset data. Palette lives as
 * cat-1..cat-6 tokens (app/globals.css) - see document/design-system.md §2. */
const CATEGORY_PALETTE = [
  "text-cat-1 bg-cat-1-bg",
  "text-cat-2 bg-cat-2-bg",
  "text-cat-3 bg-cat-3-bg",
  "text-cat-4 bg-cat-4-bg",
  "text-cat-5 bg-cat-5-bg",
  "text-cat-6 bg-cat-6-bg",
];

const CATEGORY_ACCENT_VARS = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
];

function categoryHash(categoryId: string): number {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  return hash % CATEGORY_PALETTE.length;
}

export function categoryTint(categoryId: string): string {
  return CATEGORY_PALETTE[categoryHash(categoryId)];
}

/** Raw `hsl(var(--cat-N))` for a report card's top accent bar (`--acc` custom
 * property) - same hash as categoryTint, so a card's accent always matches its
 * folder badge's tint. */
export function categoryAccent(categoryId: string): string {
  return `hsl(${CATEGORY_ACCENT_VARS[categoryHash(categoryId)]})`;
}
