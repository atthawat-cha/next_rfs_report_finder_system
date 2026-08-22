import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/notifications — the current user's own notifications, latest 50,
 * plus a true unread count (not derived from the truncated list).
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const [notifications, unreadCount] = await Promise.all([
            prisma.notifications.findMany({
                where: { user_id: authResult.user.id },
                orderBy: { created_at: 'desc' },
                take: 50,
            }),
            prisma.notifications.count({
                where: { user_id: authResult.user.id, is_read: false },
            }),
        ]);

        return NextResponse.json({ success: true, data: { notifications, unread_count: unreadCount } }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
