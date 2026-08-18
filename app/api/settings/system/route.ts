import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

const STORAGE_LIMIT_KEY = 'STORAGE_LIMIT_BYTES';
const MAINTENANCE_MODE_KEY = 'MAINTENANCE_MODE';
const DEFAULT_STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

/**
 * GET/PUT /api/settings/system
 * Phase 4e — first real consumer of the `settings` table (previously only
 * ever had one seeded SYSTEM_NAME row, no code read/wrote it). Admin-only,
 * distinct from GET/PUT /api/settings/theme which is per-user and any-role.
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const rows = await prisma.settings.findMany({
            where: { key: { in: [STORAGE_LIMIT_KEY, MAINTENANCE_MODE_KEY] } },
        });
        const byKey = new Map(rows.map((r) => [r.key, r.value]));

        return NextResponse.json({
            success: true,
            data: {
                storage_limit_bytes: Number(byKey.get(STORAGE_LIMIT_KEY) ?? DEFAULT_STORAGE_LIMIT_BYTES),
                maintenance_mode: (byKey.get(MAINTENANCE_MODE_KEY) ?? 'false') === 'true',
            },
        }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const putZod = z.object({
    storage_limit_bytes: z.number().int().positive(),
    maintenance_mode: z.boolean(),
});

async function upsertSetting(key: string, value: string, type: string, category: string) {
    await prisma.settings.upsert({
        where: { key },
        create: { id: faker.string.uuid(), key, value, type, category, updated_at: new Date() },
        update: { value, updated_at: new Date() },
    });
}

export async function PUT(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const validate = putZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const data = validate.data;

        const previous = await prisma.settings.findUnique({ where: { key: MAINTENANCE_MODE_KEY } });
        const wasMaintenanceOn = previous?.value === 'true';

        await Promise.all([
            upsertSetting(STORAGE_LIMIT_KEY, String(data.storage_limit_bytes), 'NUMBER', 'SYSTEM'),
            upsertSetting(MAINTENANCE_MODE_KEY, String(data.maintenance_mode), 'BOOLEAN', 'SYSTEM'),
        ]);

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'system',
            description: `Updated system settings: storage_limit_bytes=${data.storage_limit_bytes}, maintenance_mode=${data.maintenance_mode}`,
        });

        if (wasMaintenanceOn !== data.maintenance_mode) {
            const users = await prisma.users.findMany({ select: { id: true } });
            const title = data.maintenance_mode ? 'ระบบกำลังเข้าสู่โหมดปิดปรับปรุง' : 'ระบบกลับมาใช้งานได้ตามปกติ';
            const message = data.maintenance_mode
                ? 'ระบบอยู่ระหว่างปิดปรับปรุง อาจมีการหยุดชะงักชั่วคราว'
                : 'การปิดปรับปรุงระบบเสร็จสิ้นแล้ว สามารถใช้งานได้ตามปกติ';
            await Promise.all(users.map((u) => createNotification(u.id, 'SYSTEM_MAINTENANCE', title, message)));
        }

        return NextResponse.json({
            success: true,
            data: { storage_limit_bytes: data.storage_limit_bytes, maintenance_mode: data.maintenance_mode },
        }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
