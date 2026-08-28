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
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  ARCHIVED: "bg-muted text-muted-foreground",
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
    return { ext: "PDF", Icon: FileText, badgeClassName: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" };
  }
  if (isSpreadsheetFile(ref)) {
    return { ext: "XLSX", Icon: FileSpreadsheet, badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" };
  }
  const ext = file.file_name?.split(".").pop()?.toUpperCase() ?? "";
  return { ext: ext || "FILE", Icon: FileIcon, badgeClassName: "bg-muted text-muted-foreground" };
}

export function AccessLockIcon({ access, className, titleAccess }: { access: string; className?: string; titleAccess: string }) {
  if (access === "PUBLIC") return null;
  return (
    <Lock
      className={cn("h-3 w-3 shrink-0", access === "PRIVATE" ? "text-destructive" : "text-amber-600 dark:text-amber-400", className)}
      aria-label={titleAccess}
    >
      <title>{titleAccess}</title>
    </Lock>
  );
}

/** Deterministic tint per category id - categories.icon/color exist in the
 * schema but are never populated through the admin UI (categoryFormDialog.tsx
 * doesn't expose them), so cycling a fixed palette by id hash gives folder
 * cards visual variety without depending on unset data. */
const CATEGORY_PALETTE = [
  "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/40",
  "text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950/40",
  "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40",
  "text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-950/40",
  "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40",
  "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950/40",
];

export function categoryTint(categoryId: string): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}
