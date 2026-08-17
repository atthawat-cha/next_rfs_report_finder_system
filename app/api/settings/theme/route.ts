import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const themeZod = z.object({
    theme: z.enum(['light', 'dark', 'system']),
});

/**
 * GET /api/settings/theme — the current user's persisted theme preference.
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const user = await prisma.users.findUnique({
            where: { id: authResult.user.id },
            select: { theme_preference: true },
        });

        return NextResponse.json({ success: true, data: { theme: user?.theme_preference ?? null } }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * PUT /api/settings/theme — persist the current user's theme preference.
 */
export async function PUT(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const parsed = themeZod.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
        }

        await prisma.users.update({
            where: { id: authResult.user.id },
            data: { theme_preference: parsed.data.theme },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
