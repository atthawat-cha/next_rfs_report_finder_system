import { NextRequest } from 'next/server';
import { faker } from '@faker-js/faker';
import prisma from '@/lib/prisma';
import { Prisma } from '@/app/generated/prisma/client';
import { getClientIp } from '@/lib/request-info';

export type ActivityAction = 'create' | 'update' | 'delete' | 'login' | 'login_failed' | 'logout';
export type ActivityEntity = 'report' | 'user' | 'department' | 'role' | 'auth';

interface LogActivityParams {
  userId?: string | null;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}

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
        metadata: params.metadata,
      },
    });
  } catch (err) {
    console.error('[logActivity] failed to write activity log:', err);
  }
}
