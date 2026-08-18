import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * DELETE /api/reports/favorites/[reportId] — remove a favorite for the current user
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ reportId: string }> }) {
    const params = await props.params;
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { reportId } = params;

        await prisma.favorites.delete({
            where: {
                user_id_report_id: {
                    user_id: authResult.user.id,
                    report_id: reportId,
                },
            },
        }).catch(() => null); // idempotent: already-removed favorite is not an error

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'unfavorite',
            entity: 'report',
            entityId: reportId,
            description: `Unfavorited report ${reportId}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
