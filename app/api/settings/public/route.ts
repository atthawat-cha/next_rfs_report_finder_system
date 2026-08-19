import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const PUBLIC_KEYS = ['ORG_NAME', 'ADMIN_EMAIL'];

/**
 * GET /api/settings/public — genuinely public, no auth check by design
 * (same stance as GET /api/shares/[token]) - org branding needs to render
 * on the login screen before anyone is authenticated. Exposes exactly the
 * two settings meant for general display (org branding, admin contact on
 * error/empty states), via an explicit key allowlist rather than trusting
 * `settings.is_public` alone, since that column has no other
 * reader/writer convention in this codebase yet to lean on.
 */
export async function GET() {
    try {
        const rows = await prisma.settings.findMany({
            where: { key: { in: PUBLIC_KEYS }, is_public: true },
        });
        const byKey = new Map(rows.map((r) => [r.key, r.value]));

        return NextResponse.json({
            success: true,
            data: {
                org_name: byKey.get('ORG_NAME') ?? '',
                admin_email: byKey.get('ADMIN_EMAIL') ?? '',
            },
        }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
