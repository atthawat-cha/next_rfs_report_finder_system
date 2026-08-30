import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { visibleReportIdsFor } from '@/lib/report-acl';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/reports/browse/facets
 * Category/department counts scoped to the caller's ACL-visible reports
 * (same visibleReportIdsFor() as GET /api/reports/browse) - powers
 * report-list's "popular categories" folder row and department filter for
 * every authenticated tier, not just admins. GET /api/reports/categories and
 * GET /api/reports/departments are admin-only and return full master-data
 * rows (icon/color/parent_id/is_active/...) - this endpoint is deliberately
 * separate and minimal (id/name/count only) rather than loosening either of
 * those for a browse-only need.
 *
 * Admin callers bypass the ACL entirely (same isAdmin re-check pattern as
 * GET /api/reports/browse) so counts reflect every report regardless of
 * status/access_level, matching what GET /api/reports/browse returns them.
 */
export async function GET(req: NextRequest) {
    try {
        const acceptedRoles = routeAcceptted('user');
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, acceptedRoles);
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const isAdmin = routeAcceptted('admin').includes(authResult.user.roles?.name?.toLowerCase() ?? '');

        let visibleIds: string[] | null = null;
        if (!isAdmin) {
            visibleIds = await visibleReportIdsFor(authResult.user);
            if (visibleIds.length === 0) {
                return NextResponse.json({ success: true, data: { categories: [], departments: [] } }, { status: 200 });
            }
        }

        const [categoryGroups, departmentGroups] = await Promise.all([
            prisma.reports.groupBy({
                by: ['category_id'],
                where: { ...(visibleIds ? { id: { in: visibleIds } } : {}) },
                _count: { _all: true },
            }),
            prisma.reports.groupBy({
                by: ['department_id'],
                where: { ...(visibleIds ? { id: { in: visibleIds } } : {}), department_id: { not: null } },
                _count: { _all: true },
            }),
        ]);

        const [categoryRows, departmentRows] = await Promise.all([
            prisma.categories.findMany({
                where: { id: { in: categoryGroups.map((g) => g.category_id) } },
                select: { id: true, name: true },
            }),
            prisma.departments.findMany({
                where: { id: { in: departmentGroups.map((g) => g.department_id as string) } },
                select: { id: true, name: true },
            }),
        ]);

        const categoryCountById = new Map(categoryGroups.map((g) => [g.category_id, g._count._all]));
        const departmentCountById = new Map(departmentGroups.map((g) => [g.department_id as string, g._count._all]));

        const categories = categoryRows
            .map((c) => ({ id: c.id, name: c.name, count: categoryCountById.get(c.id) ?? 0 }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        const departments = departmentRows
            .map((d) => ({ id: d.id, name: d.name, count: departmentCountById.get(d.id) ?? 0 }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ success: true, data: { categories, departments } }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
