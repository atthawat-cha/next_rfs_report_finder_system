import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';
import { logDevError } from '@/lib/log-dev-error';

const STORAGE_LIMIT_KEY = 'STORAGE_LIMIT_BYTES';
const RENOTIFY_WINDOW_HOURS = 24;

/**
 * POST /api/system/jobs/check-storage
 * Phase 4e — same "no cron, manually-invokable hook" shape as
 * check-report-expiry. De-duped by checking for a recent unread
 * SYSTEM_STORAGE_LOW notification instead of a per-row flag, since this is
 * a recurring-until-acknowledged condition, not a one-time event.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const limitRow = await prisma.settings.findUnique({ where: { key: STORAGE_LIMIT_KEY } });
        if (!limitRow) {
            return NextResponse.json({
                success: true,
                data: { over_threshold: false, current_bytes: null, limit_bytes: null, reason: 'no threshold configured' },
            }, { status: 200 });
        }
        const limitBytes = Number(limitRow.value);

        const storageSum = await prisma.report_files.aggregate({ _sum: { file_size: true } });
        const currentBytes = Number(storageSum._sum.file_size ?? BigInt(0));
        const overThreshold = currentBytes >= limitBytes;

        if (overThreshold) {
            const recentAlert = await prisma.notifications.findFirst({
                where: {
                    type: 'SYSTEM_STORAGE_LOW',
                    is_read: false,
                    created_at: { gte: new Date(Date.now() - RENOTIFY_WINDOW_HOURS * 60 * 60 * 1000) },
                },
            });

            if (!recentAlert) {
                const admins = await prisma.users.findMany({
                    where: { roles: { name: { in: ['ADMIN', 'SUPER_ADMIN'] } } },
                    select: { id: true },
                });
                await Promise.all(
                    admins.map((a) =>
                        createNotification(
                            a.id,
                            'SYSTEM_STORAGE_LOW',
                            'พื้นที่จัดเก็บใกล้เต็ม',
                            `พื้นที่จัดเก็บไฟล์รายงานใช้ไปแล้ว ${(currentBytes / 1024 / 1024 / 1024).toFixed(2)} GB จากขีดจำกัด ${(limitBytes / 1024 / 1024 / 1024).toFixed(2)} GB`
                        )
                    )
                );
            }
        }

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'system',
            description: `check-storage job: current=${currentBytes} limit=${limitBytes} over_threshold=${overThreshold}`,
        });

        return NextResponse.json({
            success: true,
            data: { over_threshold: overThreshold, current_bytes: currentBytes, limit_bytes: limitBytes },
        }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
