import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';

const STORAGE_LIMIT_KEY = 'STORAGE_LIMIT_BYTES';
const RENOTIFY_WINDOW_HOURS = 24;

/**
 * Core logic for the "check-storage" job, extracted from
 * `app/api/system/jobs/check-storage/route.ts` (Phase 7a) - see
 * `checkReportExpiry.ts`'s header comment for why this is a separate
 * function from the route handler. De-duped by checking for a recent
 * unread SYSTEM_STORAGE_LOW notification instead of a per-row flag, since
 * this is a recurring-until-acknowledged condition, not a one-time event.
 */
export async function runCheckStorage(req: NextRequest, triggeredByUserId: string | null) {
    const limitRow = await prisma.settings.findUnique({ where: { key: STORAGE_LIMIT_KEY } });
    if (!limitRow) {
        return { over_threshold: false, current_bytes: null, limit_bytes: null, reason: 'no threshold configured' };
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

    await logActivity(req, {
        userId: triggeredByUserId,
        action: 'update',
        entity: 'system',
        description: `check-storage job: current=${currentBytes} limit=${limitBytes} over_threshold=${overThreshold}`,
    });

    return { over_threshold: overThreshold, current_bytes: currentBytes, limit_bytes: limitBytes };
}
