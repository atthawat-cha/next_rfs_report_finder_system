import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logDevError } from '@/lib/log-dev-error';

const disableZod = z.object({ password: z.string().min(1) });

/**
 * POST /api/auth/2fa/disable — requires re-entering the current password
 * (not just being logged in) since this lowers account security.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const validate = disableZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
        }

        const user = await prisma.users.findUnique({
            where: { id: authResult.user.id },
            select: { password: true },
        });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        const passwordOk = await bcrypt.compare(validate.data.password, user.password);
        if (!passwordOk) {
            return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.users.update({
                where: { id: authResult.user.id },
                data: { two_factor_enabled: false, two_factor_secret: null },
            });
            await tx.two_factor_backup_codes.deleteMany({ where: { user_id: authResult.user.id } });
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'update',
            entity: 'user',
            entityId: authResult.user.id,
            description: '2FA disabled',
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
