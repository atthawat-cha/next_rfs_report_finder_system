import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { checkGeneralRateLimit } from '@/lib/rate-limit';
import { uploadSubReportFile, deleteSubReportFile } from '@/lib/subReportUploadServices';
import { logActivity } from '@/lib/activity-log';
import { faker } from '@faker-js/faker';
import { z } from 'zod';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/reports/[id]/sub-reports — list report_sub_reports for this
 * report, grouped by slot in the UI (ordered here by slot then sort_order).
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const subReports = await prisma.report_sub_reports.findMany({
            where: { report_id: params.id },
            include: { linked_report: { select: { id: true, code: true, name_th: true } } },
            orderBy: [{ slot: 'asc' }, { sort_order: 'asc' }],
        });

        const data = subReports.map((s) => ({ ...s, file_size: s.file_size !== null ? Number(s.file_size) : null }));

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const slotZod = z.enum(['HEADER', 'DETAIL', 'FOOTER']);
const sourceTypeZod = z.enum(['UPLOAD', 'LINKED_REPORT']);

/**
 * POST /api/reports/[id]/sub-reports (multipart: name, slot, source_type,
 * then either `file` for UPLOAD or `linked_report_id` for LINKED_REPORT) —
 * attach a sub-report at a named slot. Editing the underlying file/link isn't
 * supported (MVP, see document/phase10-plan.md) — delete + re-add instead.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const rate = await checkGeneralRateLimit(authResult.user.id);
        if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

        const report = await prisma.reports.findUnique({ where: { id: params.id }, select: { id: true } });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        const data = await req.formData();

        const nameValidate = z.string().min(1, "Name is required").safeParse(data.get('name'));
        if (!nameValidate.success) {
            return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
        }
        const slotValidate = slotZod.safeParse(data.get('slot'));
        if (!slotValidate.success) {
            return NextResponse.json({ success: false, error: "Invalid or missing slot" }, { status: 400 });
        }
        const sourceTypeValidate = sourceTypeZod.safeParse(data.get('source_type'));
        if (!sourceTypeValidate.success) {
            return NextResponse.json({ success: false, error: "Invalid or missing source_type" }, { status: 400 });
        }

        const name = nameValidate.data;
        const slot = slotValidate.data;
        const sourceType = sourceTypeValidate.data;
        const user = await getCurrentUser();

        let filePath: string | null = null;
        let fileName: string | null = null;
        let fileType: string | null = null;
        let fileSize: number | null = null;
        let linkedReportId: string | null = null;

        if (sourceType === 'UPLOAD') {
            const file = data.get('file') as File | null;
            if (!file) {
                return NextResponse.json({ success: false, error: "file is required for source_type UPLOAD" }, { status: 400 });
            }
            const uploadResult = await uploadSubReportFile(file);
            if (!uploadResult.success) {
                return NextResponse.json({ success: false, error: uploadResult.error, validationErrors: uploadResult.validationErrors }, { status: 400 });
            }
            filePath = uploadResult.data.filePath;
            fileName = uploadResult.data.fileName;
            fileType = uploadResult.data.fileType;
            fileSize = uploadResult.data.fileSize;
        } else {
            const linkedIdValidate = z.string().min(1).safeParse(data.get('linked_report_id'));
            if (!linkedIdValidate.success) {
                return NextResponse.json({ success: false, error: "linked_report_id is required for source_type LINKED_REPORT" }, { status: 400 });
            }
            if (linkedIdValidate.data === params.id) {
                return NextResponse.json({ success: false, error: "A report cannot link itself as a sub-report" }, { status: 400 });
            }
            const linkedReport = await prisma.reports.findUnique({ where: { id: linkedIdValidate.data }, select: { id: true } });
            if (!linkedReport) {
                return NextResponse.json({ success: false, error: "Linked report not found" }, { status: 404 });
            }
            linkedReportId = linkedReport.id;
        }

        const created = await prisma.report_sub_reports.create({
            data: {
                id: faker.string.uuid(),
                report_id: params.id,
                name,
                slot,
                source_type: sourceType,
                linked_report_id: linkedReportId,
                file_path: filePath,
                file_name: fileName,
                file_type: fileType,
                file_size: fileSize,
                sort_order: 0,
                created_by: user?.id as string,
            },
        });

        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'create',
            entity: 'report',
            entityId: params.id,
            description: `Added sub-report "${created.name}" (${slot}) to report ${params.id}`,
        });

        return NextResponse.json(
            { success: true, data: { ...created, file_size: created.file_size !== null ? Number(created.file_size) : null } },
            { status: 200 }
        );
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const updateZod = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    slot: slotZod.optional(),
    sort_order: z.number().int().optional(),
});

/**
 * PUT /api/reports/[id]/sub-reports — rename/reslot/reorder only. The
 * underlying file or linked report can't be changed here (MVP).
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const rate = await checkGeneralRateLimit(authResult.user.id);
        if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const { id, name, slot, sort_order } = validate.data;

        const existing = await prisma.report_sub_reports.findFirst({ where: { id, report_id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Sub-report not found" }, { status: 404 });
        }

        const updated = await prisma.report_sub_reports.update({
            where: { id: existing.id },
            data: {
                name: name ?? existing.name,
                slot: slot ?? existing.slot,
                sort_order: sort_order ?? existing.sort_order,
            },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'report',
            entityId: params.id,
            description: `Updated sub-report "${updated.name}" on report ${params.id}`,
        });

        return NextResponse.json(
            { success: true, data: { ...updated, file_size: updated.file_size !== null ? Number(updated.file_size) : null } },
            { status: 200 }
        );
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/[id]/sub-reports?id=<subReportId> — remove a
 * sub-report. If it's an UPLOAD, best-effort delete the stored file.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const rate = await checkGeneralRateLimit(authResult.user.id);
        if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

        const subReportId = req.nextUrl.searchParams.get('id');
        if (!subReportId) {
            return NextResponse.json({ success: false, error: "Missing id query param" }, { status: 400 });
        }

        const existing = await prisma.report_sub_reports.findFirst({ where: { id: subReportId, report_id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Sub-report not found" }, { status: 404 });
        }

        await prisma.report_sub_reports.delete({ where: { id: existing.id } });

        if (existing.source_type === 'UPLOAD' && existing.file_path) {
            await deleteSubReportFile(existing.file_path);
        }

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'delete',
            entity: 'report',
            entityId: params.id,
            description: `Deleted sub-report "${existing.name}" from report ${params.id}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
