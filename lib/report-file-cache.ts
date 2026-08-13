import prisma from '@/lib/prisma';
import { FileKind, ReportOutputType } from '@/app/generated/prisma/enums';

/**
 * reports.file_path/file_name/file_type/file_size are kept as a synced cache
 * from report_files (system-design.md §5.2) for read-performance in list views
 * that don't need the full file set. When a report has multiple `is_current`
 * files at once (e.g. a PRINT_FORM report with both BLANK_FORM and
 * SAMPLE_FILLED_FORM current), the primary source is picked by a fixed
 * priority per output_type — not "most recently uploaded" — so the cache
 * doesn't flicker between files depending on upload order.
 */
const PRIMARY_KIND_BY_OUTPUT_TYPE: Record<ReportOutputType, FileKind> = {
  PRINT_FORM: FileKind.BLANK_FORM,
  DATA_REPORT: FileKind.SAMPLE_DATA,
};

export async function syncReportFileCache(reportId: string): Promise<void> {
  const report = await prisma.reports.findUnique({
    where: { id: reportId },
    select: { output_type: true },
  });
  if (!report) return;

  const primaryKind = PRIMARY_KIND_BY_OUTPUT_TYPE[report.output_type];

  const primaryFile = await prisma.report_files.findFirst({
    where: { report_id: reportId, file_kind: primaryKind, is_current: true },
    orderBy: { created_at: 'desc' },
  });

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
