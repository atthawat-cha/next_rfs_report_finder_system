import { AccessLevel, ReportStatus } from '@/app/generated/prisma/enums';
import prisma from '@/lib/prisma';

/**
 * Phase 1 coarse visibility rule for non-admin users — access_level + status only,
 * no per-report ACL yet (that's lib/report-acl.ts in Phase 2). Kept in one place so
 * browse/favorites/download stay consistent and Phase 2 can swap this out cleanly.
 * See document/phase1-plan.md.
 */
export const nonAdminVisibilityWhere = {
  status: ReportStatus.PUBLISHED,
  access_level: AccessLevel.PUBLIC,
} as const;

export async function isReportVisibleToNonAdmin(reportId: string): Promise<boolean> {
  const report = await prisma.reports.findFirst({
    where: { id: reportId, ...nonAdminVisibilityWhere },
    select: { id: true },
  });
  return report !== null;
}
