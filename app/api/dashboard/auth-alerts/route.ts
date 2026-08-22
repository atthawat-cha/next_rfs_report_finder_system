import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';

const DEFAULT_HOURS = 24;
const MAX_HOURS = 168;
const MIN_ATTEMPTS = 5;

/**
 * GET /api/dashboard/auth-alerts?hours=24
 * Smallest useful version of abnormal-auth-pattern alerting (phase4-plan.md 4f#3):
 * a dashboard card, no external delivery channel. Flags IPs with >= MIN_ATTEMPTS
 * `login_failed` activity_logs rows within the window — live-queried, no
 * precompute (same no-cache stance as the rest of /api/dashboard/*).
 */
export async function GET(req: NextRequest) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        let hours = Number(req.nextUrl.searchParams.get('hours'));
        if (!Number.isFinite(hours) || hours < 1) hours = DEFAULT_HOURS;
        hours = Math.min(hours, MAX_HOURS);

        const rows = await prisma.$queryRaw<{
            ip_address: string;
            attempts: bigint;
            targeted_accounts: bigint;
            first_attempt_at: Date;
            last_attempt_at: Date;
        }[]>`
            SELECT
                ip_address,
                COUNT(*)::bigint AS attempts,
                COUNT(DISTINCT user_id)::bigint AS targeted_accounts,
                MIN(created_at) AS first_attempt_at,
                MAX(created_at) AS last_attempt_at
            FROM activity_logs
            WHERE action = 'login_failed'
              AND ip_address IS NOT NULL
              AND created_at >= now() - (${hours}::text || ' hours')::interval
            GROUP BY ip_address
            HAVING COUNT(*) >= ${MIN_ATTEMPTS}
            ORDER BY attempts DESC
            LIMIT 20
        `;

        return NextResponse.json({
            success: true,
            data: {
                window_hours: hours,
                threshold: MIN_ATTEMPTS,
                alerts: rows.map((row) => ({
                    ip_address: row.ip_address,
                    attempts: Number(row.attempts),
                    targeted_accounts: Number(row.targeted_accounts),
                    first_attempt_at: row.first_attempt_at,
                    last_attempt_at: row.last_attempt_at,
                })),
            },
        }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
