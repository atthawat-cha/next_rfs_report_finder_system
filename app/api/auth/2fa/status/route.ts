import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/auth/2fa/status — a fresh DB read of the current user's 2FA
 * state. Not trusted from the JWT payload, which is a point-in-time
 * snapshot from login and goes stale the moment 2FA is enabled/disabled.
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const user = await prisma.users.findUnique({
            where: { id: authResult.user.id },
            select: { two_factor_enabled: true },
        });

        return NextResponse.json({ success: true, data: { enabled: user?.two_factor_enabled ?? false } }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
