import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';

/**
 * POST /api/notifications/[id]/read — mark one notification as read. Scoped
 * to the current user's own notifications (404 for anyone else's id, not
 * just a permission error — avoids confirming the id exists at all).
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.notifications.findFirst({
            where: { id: params.id, user_id: authResult.user.id },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
        }

        await prisma.notifications.update({
            where: { id: existing.id },
            data: { is_read: true, read_at: new Date() },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
