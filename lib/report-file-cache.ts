import prisma from '@/lib/prisma';
import { FileKind } from '@/app/generated/prisma/enums';

/**
 * reports.file_path/file_name/file_type/file_size are kept as a synced cache
 * from report_files (system-design.md §5.2) for read-performance in list views
 * that don't need the full file set. When a report has multiple `is_current`
 * files at once (e.g. both BLANK_FORM and SAMPLE_FILLED_FORM current — any
 * kind can coexist regardless of output_type since Phase 10 revision v3), the
 * primary source is picked by this fixed priority order — not "most recently
 * uploaded" — so the cache doesn't flicker between files depending on upload
 * order. REFERENCE_DOC is deliberately excluded — it's supporting material,
 * never the report's primary file.
 */
const PRIMARY_KIND_PRIORITY: FileKind[] = [FileKind.BLANK_FORM, FileKind.SAMPLE_FILLED_FORM, FileKind.SAMPLE_DATA];

export async function syncReportFileCache(reportId: string): Promise<void> {
  const report = await prisma.reports.findUnique({
    where: { id: reportId },
    select: { id: true },
  });
  if (!report) return;

  const currentByKind = await prisma.report_files.findMany({
    where: { report_id: reportId, file_kind: { in: PRIMARY_KIND_PRIORITY }, is_current: true },
  });

  const primaryFile = PRIMARY_KIND_PRIORITY
    .map((kind) => currentByKind.find((f) => f.file_kind === kind))
    .find((f) => f !== undefined);

  if (!primaryFile) return;

  await prisma.reports.update({
    where: { id: reportId },
    data: {
      file_path: primaryFile.file_path,
      file_name: primaryFile.file_name,
      file_type: primaryFile.file_type,
      file_size: primaryFile.file_size,
    },
  });
}
