import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';
import { getSettingNumber } from '@/lib/system-settings';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';
import { z } from 'zod';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/reports/[id]/shares — list shares for this report, joined with
 * the target's display name (USER/DEPARTMENT). LINK shares carry no target
 * to join — the token is returned as-is so the client can build the full
 * /shares/<token> URL.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const shares = await prisma.report_shares.findMany({
            where: { report_id: params.id },
            orderBy: { created_at: 'desc' },
        });

        const userIds = shares.filter((s) => s.share_type === 'USER' && s.shared_with).map((s) => s.shared_with as string);
        const deptIds = shares.filter((s) => s.share_type === 'DEPARTMENT' && s.shared_with).map((s) => s.shared_with as string);

        const [users, depts] = await Promise.all([
            userIds.length
                ? prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, first_name: true, last_name: true, username: true } })
                : Promise.resolve([]),
            deptIds.length
                ? prisma.departments.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
                : Promise.resolve([]),
        ]);

        const data = shares.map((s) => {
            if (s.share_type === 'USER') {
                const u = users.find((x) => x.id === s.shared_with);
                return { ...s, target_name: u ? (`${u.first_name} ${u.last_name}`.trim() || u.username) : 'Unknown user' };
            }
            if (s.share_type === 'DEPARTMENT') {
                const d = depts.find((x) => x.id === s.shared_with);
                return { ...s, target_name: d ? d.name : 'Unknown department' };
            }
            return { ...s, target_name: null };
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const baseFlags = {
    can_download: z.boolean().optional().default(true),
    can_edit: z.boolean().optional().default(false),
    expires_at: z.string().datetime().nullable().optional(),
};

const createZod = z.discriminatedUnion('share_type', [
    z.object({ share_type: z.literal('USER'), shared_with: z.string().min(1), ...baseFlags }),
    z.object({ share_type: z.literal('DEPARTMENT'), shared_with: z.string().min(1), ...baseFlags }),
    z.object({ share_type: z.literal('LINK'), ...baseFlags }),
]);

/**
 * POST /api/reports/[id]/shares — create a share. USER/DEPARTMENT targets
 * are validated to actually exist; LINK generates a server-side random
 * token (never accepted from the client).
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const report = await prisma.reports.findUnique({ where: { id: params.id }, select: { id: true, name_th: true } });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = createZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const data = validate.data;

        let sharedWith: string | null = null;
        let shareToken: string | null = null;

        if (data.share_type === 'USER') {
            const exists = await prisma.users.findUnique({ where: { id: data.shared_with }, select: { id: true } });
            if (!exists) {
                return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
            }
            sharedWith = data.shared_with;
        } else if (data.share_type === 'DEPARTMENT') {
            const exists = await prisma.departments.findUnique({ where: { id: data.shared_with }, select: { id: true } });
            if (!exists) {
                return NextResponse.json({ success: false, error: "Department not found" }, { status: 404 });
            }
            sharedWith = data.shared_with;
        } else {
            shareToken = crypto.randomBytes(24).toString('hex');
        }

        // expires_at omitted entirely (not sent) -> fall back to
        // DEFAULT_SHARE_EXPIRY_DAYS (Phase 5e) if an admin configured one.
        // An explicit null in the body still means "never expires" - the
        // existing sharing UI always sends one or the other deliberately,
        // so this only changes behavior for callers that omit the key.
        let expiresAt: Date | null = data.expires_at ? new Date(data.expires_at) : null;
        if (data.expires_at === undefined) {
            const defaultDays = await getSettingNumber('DEFAULT_SHARE_EXPIRY_DAYS', 0);
            if (defaultDays > 0) {
                expiresAt = new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000);
            }
        }

        const user = await getCurrentUser();
        const created = await prisma.report_shares.create({
            data: {
                id: faker.string.uuid(),
                report_id: params.id,
                shared_by: user?.id as string,
                shared_with: sharedWith,
                share_token: shareToken,
                share_type: data.share_type,
                can_download: data.can_download,
                can_edit: data.can_edit,
                expires_at: expiresAt,
                created_at: new Date(),
            },
        });

        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'create',
            entity: 'report',
            entityId: params.id,
            description: `Created ${data.share_type} share for report ${params.id}`,
        });

        if (data.share_type === 'USER' && sharedWith) {
            await createNotification(
                sharedWith,
                'REPORT_SHARED',
                'มีรายงานถูกแชร์ให้คุณ',
                `รายงาน "${report.name_th}" ถูกแชร์ให้คุณ`
            );
        } else if (data.share_type === 'DEPARTMENT' && sharedWith) {
            const members = await prisma.users.findMany({
                where: { department_id: sharedWith, id: { not: user?.id } },
                select: { id: true },
            });
            await Promise.all(
                members.map((m) =>
                    createNotification(
                        m.id,
                        'REPORT_SHARED',
                        'มีรายงานถูกแชร์ให้แผนกของคุณ',
                        `รายงาน "${report.name_th}" ถูกแชร์ให้แผนกของคุณ`
                    )
                )
            );
        }

        return NextResponse.json({ success: true, data: created }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/[id]/shares?id=<shareId> — revoke a share.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const shareId = req.nextUrl.searchParams.get('id');
        if (!shareId) {
            return NextResponse.json({ success: false, error: "Missing id query param" }, { status: 400 });
        }

        const existing = await prisma.report_shares.findFirst({ where: { id: shareId, report_id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Share not found" }, { status: 404 });
        }

        await prisma.report_shares.delete({ where: { id: existing.id } });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'delete',
            entity: 'report',
            entityId: params.id,
            description: `Revoked ${existing.share_type} share on report ${params.id}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
