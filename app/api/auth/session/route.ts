import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/auth/session — the caller's own session identity, straight from
 * the JWT payload (createToken already embeds `roles`, see lib/types.ts's
 * UserSessionType) — no DB query. Powers the navbar's UserNav, which
 * previously never received real user data at all (see
 * document/phase14-plan.md).
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const { user } = authResult;
        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                first_name: user.first_name,
                username: user.username,
                role: user.roles?.name ?? null,
            },
        }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
