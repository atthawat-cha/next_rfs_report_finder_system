import prisma from '@/lib/prisma';
import { UserSessionType } from '@/lib/types';

/**
 * Central per-report ACL resolver (system-design.md §3.5). Resolution order,
 * most-specific wins:
 *   1. Individual report_permissions row (report_id, user_id)
 *   2. Role-level report_permissions row (report_id, user's role_id)
 *   3. Fallback to reports.access_level: PUBLIC+PUBLISHED → view/favorite/export/print
 *      for everyone; RESTRICTED/PRIVATE → default-deny without an explicit grant.
 *
 * Admin-tier routes (routeAcceptted('admin')) bypass this entirely by design — this
 * module governs non-admin visibility and action rights only. Callers must check the
 * caller's role themselves before deciding whether to call into this module at all.
 *
 * subject_id on report_permissions refers to users.id or roles.id depending on
 * subject_type — not FK'd to both (Postgres/Prisma can't express a conditional FK),
 * so it is validated at the application layer, never trusted from client input directly.
 */

export interface ReportAclFlags {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_favorite: boolean;
  can_export: boolean;
  can_print: boolean;
}

const DENY_ALL: ReportAclFlags = {
  can_view: false,
  can_edit: false,
  can_delete: false,
  can_favorite: false,
  can_export: false,
  can_print: false,
};

const PUBLIC_FALLBACK: ReportAclFlags = {
  can_view: true,
  can_edit: false,
  can_delete: false,
  can_favorite: true,
  can_export: true,
  can_print: true,
};

function toFlags(row: {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_favorite: boolean;
  can_export: boolean;
  can_print: boolean;
}): ReportAclFlags {
  return {
    can_view: row.can_view,
    can_edit: row.can_edit,
    can_delete: row.can_delete,
    can_favorite: row.can_favorite,
    can_export: row.can_export,
    can_print: row.can_print,
  };
}

export async function resolveReportAcl(reportId: string, user: UserSessionType): Promise<ReportAclFlags> {
  const individual = await prisma.report_permissions.findUnique({
    where: {
      report_id_subject_type_subject_id: {
        report_id: reportId,
        subject_type: 'USER',
        subject_id: user.id,
      },
    },
  });
  if (individual) return toFlags(individual);

  if (user.roles?.id) {
    const roleGrant = await prisma.report_permissions.findUnique({
      where: {
        report_id_subject_type_subject_id: {
          report_id: reportId,
          subject_type: 'ROLE',
          subject_id: user.roles.id,
        },
      },
    });
    if (roleGrant) return toFlags(roleGrant);
  }

  const report = await prisma.reports.findUnique({
    where: { id: reportId },
    select: { status: true, access_level: true },
  });
  if (report?.status === 'PUBLISHED' && report.access_level === 'PUBLIC') {
    return PUBLIC_FALLBACK;
  }
  return DENY_ALL;
}

/**
 * List-endpoint variant: report IDs the user can view, resolved with the same
 * priority (individual > role > access_level fallback) in a single query so
 * callers can filter with `WHERE id IN (...)` at the query level — never
 * post-fetch in application code (leaks existence/count information, doesn't scale).
 */
export async function visibleReportIdsFor(user: UserSessionType): Promise<string[]> {
  const roleId = user.roles?.id ?? null;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT r.id FROM reports r
    LEFT JOIN report_permissions individual
      ON individual.report_id = r.id AND individual.subject_type = 'USER' AND individual.subject_id = ${user.id}
    LEFT JOIN report_permissions role_grant
      ON role_grant.report_id = r.id AND role_grant.subject_type = 'ROLE' AND role_grant.subject_id = ${roleId}
    WHERE COALESCE(
      individual.can_view,
      role_grant.can_view,
      (r.status = 'PUBLISHED' AND r.access_level = 'PUBLIC')
    )
  `;
  return rows.map((r) => r.id);
}
