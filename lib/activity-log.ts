import { NextRequest } from 'next/server';
import { faker } from '@faker-js/faker';
import prisma from '@/lib/prisma';
import { getClientIp } from '@/lib/request-info';
import logger from '@/lib/logger';

export type ActivityAction = 'create' | 'update' | 'delete' | 'login' | 'login_failed' | 'logout' | 'favorite' | 'unfavorite' | 'download' | 'view';
export type ActivityEntity = 'report' | 'user' | 'department' | 'role' | 'auth' | 'system' | 'menu' | 'category' | 'tag';

interface LogActivityParams {
    userId?: string | null;
    action: ActivityAction;
    entity: ActivityEntity;
    entityId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
}

/**
 * เขียน audit log ลงตาราง activity_logs
 *
 * error ถูก swallow ไว้ทั้งหมด — การเขียน log ล้มเหลวต้องไม่ทำให้ response ของ caller พัง
 * แต่ caller ควร `await` (ไม่ใช่ปล่อย detach) เพื่อให้เขียนเสร็จก่อนส่ง response
 */
export async function logActivity(req: NextRequest, params: LogActivityParams): Promise<void> {
    try {
        await prisma.activity_logs.create({
            data: {
                id: faker.string.uuid(),
                user_id: params.userId ?? null,
                action: params.action,
                entity: params.entity,
                entity_id: params.entityId,
                description: params.description,
                ip_address: getClientIp(req),
                user_agent: req.headers.get('user-agent') ?? undefined,
                metadata: params.metadata as never,
            },
        });
    } catch (err) {
        logger.error({ err, action: params.action, entity: params.entity, entityId: params.entityId }, 'logActivity failed to write activity log');
    }
}
