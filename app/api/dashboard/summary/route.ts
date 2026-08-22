import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/dashboard/summary
 * Live-computed counts — no cache/precompute (dataset size doesn't warrant it yet).
 * Storage sums ALL report_files rows (not just is_current) — old versions stay on
 * disk per the 3a versioning design, so that's the real footprint.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const [
            byStatus,
            byCategory,
            byDepartment,
            categories,
            departments,
            totalReports,
            activeUsers,
            totalDownloads,
            totalFavorites,
            storageSum,
        ] = await Promise.all([
            prisma.reports.groupBy({ by: ['status'], _count: { _all: true } }),
            prisma.reports.groupBy({ by: ['category_id'], _count: { _all: true } }),
            prisma.reports.groupBy({ by: ['department_id'], _count: { _all: true } }),
            prisma.categories.findMany({ select: { id: true, name: true } }),
            prisma.departments.findMany({ select: { id: true, name: true } }),
            prisma.reports.count(),
            prisma.users.count({ where: { status: 'ACTIVE' } }),
            prisma.downloads.count(),
            prisma.favorites.count(),
            prisma.report_files.aggregate({ _sum: { file_size: true } }),
        ]);

        const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
        const departmentNameById = new Map(departments.map((d) => [d.id, d.name]));

        return NextResponse.json({
            success: true,
            data: {
                by_status: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
                by_category: byCategory.map((row) => ({
                    category_id: row.category_id,
                    category_name: categoryNameById.get(row.category_id) ?? 'Unknown',
                    count: row._count._all,
                })),
                by_department: byDepartment
                    .filter((row) => row.department_id !== null)
                    .map((row) => ({
                        department_id: row.department_id,
                        department_name: departmentNameById.get(row.department_id as string) ?? 'Unknown',
                        count: row._count._all,
                    })),
                totals: {
                    reports: totalReports,
                    active_users: activeUsers,
                    downloads: totalDownloads,
                    favorites: totalFavorites,
                    storage_bytes: Number(storageSum._sum.file_size ?? BigInt(0)),
                },
            },
        }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
