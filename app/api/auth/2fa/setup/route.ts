import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateTotpSecret, buildOtpauthUrl, buildQrCodeDataUrl } from '@/lib/two-factor';
import { logDevError } from '@/lib/log-dev-error';

/**
 * POST /api/auth/2fa/setup — starts enrollment: generates a new TOTP secret
 * and saves it to users.two_factor_secret, but leaves two_factor_enabled
 * false until /confirm verifies the user actually has it working. 400 if
 * already enabled - must /disable first to re-enroll, no silent secret
 * replacement on an active 2FA account.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const user = await prisma.users.findUnique({
            where: { id: authResult.user.id },
            select: { username: true, two_factor_enabled: true },
        });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }
        if (user.two_factor_enabled) {
            return NextResponse.json({ success: false, error: "2FA is already enabled — disable it first to re-enroll" }, { status: 400 });
        }

        const secret = generateTotpSecret();
        const otpauthUrl = buildOtpauthUrl(secret, user.username);
        const qrCodeDataUrl = await buildQrCodeDataUrl(otpauthUrl);

        await prisma.users.update({
            where: { id: authResult.user.id },
            data: { two_factor_secret: secret },
        });

        return NextResponse.json({ success: true, data: { secret, otpauthUrl, qrCodeDataUrl } }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
