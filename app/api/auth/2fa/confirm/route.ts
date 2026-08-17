import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyTotp, generateBackupCodes } from '@/lib/two-factor';
import { logActivity } from '@/lib/activity-log';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

const confirmZod = z.object({ code: z.string().min(6).max(6) });

/**
 * POST /api/auth/2fa/confirm — verifies one code against the pending secret
 * from /setup. On success: enables 2FA for real and generates 10 backup
 * codes, returned in plaintext exactly once (never retrievable again).
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const validate = confirmZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: "A 6-digit code is required" }, { status: 400 });
        }

        const user = await prisma.users.findUnique({
            where: { id: authResult.user.id },
            select: { two_factor_secret: true, two_factor_enabled: true },
        });
        if (!user?.two_factor_secret) {
            return NextResponse.json({ success: false, error: "Run /api/auth/2fa/setup first" }, { status: 400 });
        }
        if (user.two_factor_enabled) {
            return NextResponse.json({ success: false, error: "2FA is already enabled" }, { status: 400 });
        }

        if (!verifyTotp(user.two_factor_secret, validate.data.code)) {
            return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
        }

        const { plaintext, hashes } = await generateBackupCodes();

        await prisma.$transaction(async (tx) => {
            await tx.users.update({
                where: { id: authResult.user.id },
                data: { two_factor_enabled: true },
            });
            await tx.two_factor_backup_codes.createMany({
                data: hashes.map((hash) => ({
                    id: faker.string.uuid(),
                    user_id: authResult.user.id,
                    code_hash: hash,
                })),
            });
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'update',
            entity: 'user',
            entityId: authResult.user.id,
            description: '2FA enabled',
        });

        return NextResponse.json({ success: true, data: { backupCodes: plaintext } }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
