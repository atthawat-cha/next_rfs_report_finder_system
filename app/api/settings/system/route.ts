import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';
import { invalidateSettingsCache } from '@/lib/system-settings';
import { validateUploadBasePath } from '@/lib/storage-path';
import { currentStorageBackend } from '@/lib/storage';
import { faker } from '@faker-js/faker';
import { z } from 'zod';
import { logDevError } from '@/lib/log-dev-error';

const STORAGE_LIMIT_KEY = 'STORAGE_LIMIT_BYTES';
const MAINTENANCE_MODE_KEY = 'MAINTENANCE_MODE';
const UPLOAD_BASE_PATH_KEY = 'UPLOAD_BASE_PATH';
const MAX_UPLOAD_SIZE_BLANK_FORM_KEY = 'MAX_UPLOAD_SIZE_BLANK_FORM';
const MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM_KEY = 'MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM';
const MAX_UPLOAD_SIZE_SAMPLE_DATA_KEY = 'MAX_UPLOAD_SIZE_SAMPLE_DATA';
const ORG_NAME_KEY = 'ORG_NAME';
const ADMIN_EMAIL_KEY = 'ADMIN_EMAIL';
const DEFAULT_PAGE_SIZE_KEY = 'DEFAULT_PAGE_SIZE';
const DEFAULT_SHARE_EXPIRY_DAYS_KEY = 'DEFAULT_SHARE_EXPIRY_DAYS';

const DEFAULT_STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const DEFAULT_UPLOAD_BASE_PATH = 'public';
const DEFAULT_MAX_UPLOAD_SIZE_BLANK_FORM = 10 * 1024 * 1024; // 10 MB
const DEFAULT_MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM = 10 * 1024 * 1024; // 10 MB
const DEFAULT_MAX_UPLOAD_SIZE_SAMPLE_DATA = 20 * 1024 * 1024; // 20 MB
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_SHARE_EXPIRY_DAYS = 0; // 0 = no default expiry (existing behavior)
const MAX_UPLOAD_SIZE_CEILING_BYTES = 500 * 1024 * 1024; // 500 MB sanity ceiling

const ALL_KEYS = [
    STORAGE_LIMIT_KEY, MAINTENANCE_MODE_KEY, UPLOAD_BASE_PATH_KEY,
    MAX_UPLOAD_SIZE_BLANK_FORM_KEY, MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM_KEY, MAX_UPLOAD_SIZE_SAMPLE_DATA_KEY,
    ORG_NAME_KEY, ADMIN_EMAIL_KEY, DEFAULT_PAGE_SIZE_KEY, DEFAULT_SHARE_EXPIRY_DAYS_KEY,
];

/**
 * GET/PUT /api/settings/system
 * Phase 4e — first real consumer of the `settings` table. Phase 5e extended
 * both with STORAGE keys (UPLOAD_BASE_PATH, MAX_UPLOAD_SIZE_*, consumed by
 * lib/storage-path.ts) and GENERAL keys (ORG_NAME, ADMIN_EMAIL,
 * DEFAULT_PAGE_SIZE, DEFAULT_SHARE_EXPIRY_DAYS). Admin-only, distinct from
 * GET/PUT /api/settings/theme which is per-user and any-role, and from
 * GET /api/settings/public (5e, new) which exposes just ORG_NAME/ADMIN_EMAIL
 * to any authenticated user for UI branding/contact display.
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const rows = await prisma.settings.findMany({ where: { key: { in: ALL_KEYS } } });
        const byKey = new Map(rows.map((r) => [r.key, r.value]));

        return NextResponse.json({
            success: true,
            data: {
                storage_limit_bytes: Number(byKey.get(STORAGE_LIMIT_KEY) ?? DEFAULT_STORAGE_LIMIT_BYTES),
                maintenance_mode: (byKey.get(MAINTENANCE_MODE_KEY) ?? 'false') === 'true',
                upload_base_path: byKey.get(UPLOAD_BASE_PATH_KEY) || DEFAULT_UPLOAD_BASE_PATH,
                max_upload_size_blank_form: Number(byKey.get(MAX_UPLOAD_SIZE_BLANK_FORM_KEY) ?? DEFAULT_MAX_UPLOAD_SIZE_BLANK_FORM),
                max_upload_size_sample_filled_form: Number(byKey.get(MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM_KEY) ?? DEFAULT_MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM),
                max_upload_size_sample_data: Number(byKey.get(MAX_UPLOAD_SIZE_SAMPLE_DATA_KEY) ?? DEFAULT_MAX_UPLOAD_SIZE_SAMPLE_DATA),
                org_name: byKey.get(ORG_NAME_KEY) ?? '',
                admin_email: byKey.get(ADMIN_EMAIL_KEY) ?? '',
                default_page_size: Number(byKey.get(DEFAULT_PAGE_SIZE_KEY) ?? DEFAULT_PAGE_SIZE),
                default_share_expiry_days: Number(byKey.get(DEFAULT_SHARE_EXPIRY_DAYS_KEY) ?? DEFAULT_SHARE_EXPIRY_DAYS),
                // Read-only - controlled by the STORAGE_BACKEND env var at
                // deploy time, not editable here (see PUT's zod schema,
                // which deliberately has no field for this).
                storage_backend: currentStorageBackend(),
            },
        }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const putZod = z.object({
    storage_limit_bytes: z.number().int().positive().optional(),
    maintenance_mode: z.boolean().optional(),
    upload_base_path: z.string().min(1).optional(),
    max_upload_size_blank_form: z.number().int().positive().max(MAX_UPLOAD_SIZE_CEILING_BYTES).optional(),
    max_upload_size_sample_filled_form: z.number().int().positive().max(MAX_UPLOAD_SIZE_CEILING_BYTES).optional(),
    max_upload_size_sample_data: z.number().int().positive().max(MAX_UPLOAD_SIZE_CEILING_BYTES).optional(),
    org_name: z.string().max(255).optional(),
    admin_email: z.union([z.string().email(), z.literal('')]).optional(),
    default_page_size: z.number().int().min(1).max(200).optional(),
    default_share_expiry_days: z.number().int().min(0).max(3650).optional(),
});

async function upsertSetting(key: string, value: string, type: string, category: string, isPublic = false) {
    await prisma.settings.upsert({
        where: { key },
        create: { id: faker.string.uuid(), key, value, type, category, is_public: isPublic, updated_at: new Date() },
        update: { value, is_public: isPublic, updated_at: new Date() },
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

        // A bad UPLOAD_BASE_PATH breaks every upload and download for every
        // user, so it must fail here rather than at first use.
        if (data.upload_base_path !== undefined) {
            const pathCheck = await validateUploadBasePath(data.upload_base_path);
            if (!pathCheck.ok) {
                return NextResponse.json({ success: false, error: pathCheck.error }, { status: 400 });
            }
        }

        const previous = await prisma.settings.findUnique({ where: { key: MAINTENANCE_MODE_KEY } });
        const wasMaintenanceOn = previous?.value === 'true';

        const writes: Promise<void>[] = [];
        if (data.storage_limit_bytes !== undefined) writes.push(upsertSetting(STORAGE_LIMIT_KEY, String(data.storage_limit_bytes), 'NUMBER', 'SYSTEM'));
        if (data.maintenance_mode !== undefined) writes.push(upsertSetting(MAINTENANCE_MODE_KEY, String(data.maintenance_mode), 'BOOLEAN', 'SYSTEM'));
        if (data.upload_base_path !== undefined) writes.push(upsertSetting(UPLOAD_BASE_PATH_KEY, data.upload_base_path, 'STRING', 'STORAGE'));
        if (data.max_upload_size_blank_form !== undefined) writes.push(upsertSetting(MAX_UPLOAD_SIZE_BLANK_FORM_KEY, String(data.max_upload_size_blank_form), 'NUMBER', 'STORAGE'));
        if (data.max_upload_size_sample_filled_form !== undefined) writes.push(upsertSetting(MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM_KEY, String(data.max_upload_size_sample_filled_form), 'NUMBER', 'STORAGE'));
        if (data.max_upload_size_sample_data !== undefined) writes.push(upsertSetting(MAX_UPLOAD_SIZE_SAMPLE_DATA_KEY, String(data.max_upload_size_sample_data), 'NUMBER', 'STORAGE'));
        if (data.org_name !== undefined) writes.push(upsertSetting(ORG_NAME_KEY, data.org_name, 'STRING', 'GENERAL', true));
        if (data.admin_email !== undefined) writes.push(upsertSetting(ADMIN_EMAIL_KEY, data.admin_email, 'STRING', 'GENERAL', true));
        if (data.default_page_size !== undefined) writes.push(upsertSetting(DEFAULT_PAGE_SIZE_KEY, String(data.default_page_size), 'NUMBER', 'GENERAL'));
        if (data.default_share_expiry_days !== undefined) writes.push(upsertSetting(DEFAULT_SHARE_EXPIRY_DAYS_KEY, String(data.default_share_expiry_days), 'NUMBER', 'GENERAL'));

        await Promise.all(writes);
        invalidateSettingsCache();

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'system',
            description: `Updated system settings: ${Object.keys(data).join(', ')}`,
        });

        if (data.maintenance_mode !== undefined && wasMaintenanceOn !== data.maintenance_mode) {
            const users = await prisma.users.findMany({ select: { id: true } });
            const title = data.maintenance_mode ? 'ระบบกำลังเข้าสู่โหมดปิดปรับปรุง' : 'ระบบกลับมาใช้งานได้ตามปกติ';
            const message = data.maintenance_mode
                ? 'ระบบอยู่ระหว่างปิดปรับปรุง อาจมีการหยุดชะงักชั่วคราว'
                : 'การปิดปรับปรุงระบบเสร็จสิ้นแล้ว สามารถใช้งานได้ตามปกติ';
            await Promise.all(users.map((u) => createNotification(u.id, 'SYSTEM_MAINTENANCE', title, message)));
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
