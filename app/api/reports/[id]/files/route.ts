import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { uploadReportFile, deleteReportFile } from '@/lib/reportFileUploadServices';
import { syncReportFileCache } from '@/lib/report-file-cache';
import { logActivity } from '@/lib/activity-log';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

const VALID_KINDS_BY_OUTPUT_TYPE: Record<string, string[]> = {
    PRINT_FORM: ['BLANK_FORM', 'SAMPLE_FILLED_FORM'],
    DATA_REPORT: ['SAMPLE_DATA'],
};

/**
 * GET /api/reports/[id]/files — current report_files for this report
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const files = await prisma.report_files.findMany({
            where: { report_id: params.id, is_current: true },
            orderBy: { file_kind: 'asc' },
        });

        // file_size is BigInt — JSON.stringify can't serialize it directly
        const data = files.map((f) => ({ ...f, file_size: Number(f.file_size) }));

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const fileKindZod = z.enum(['BLANK_FORM', 'SAMPLE_FILLED_FORM', 'SAMPLE_DATA']);

/**
 * POST /api/reports/[id]/files (multipart: file, file_kind) — upload a new
 * version of a file_kind for this report. Supersedes the previous current
 * file of the same kind (versioning: is_current toggle, no diff/rollback yet
 * — that's Phase 3).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const report = await prisma.reports.findUnique({
            where: { id: params.id },
            select: { id: true, output_type: true },
        });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        const data = await req.formData();
        const fileKindValidate = fileKindZod.safeParse(data.get('file_kind'));
        if (!fileKindValidate.success) {
            return NextResponse.json({ success: false, error: "Invalid or missing file_kind" }, { status: 400 });
        }
        const fileKind = fileKindValidate.data;

        const allowedKinds = VALID_KINDS_BY_OUTPUT_TYPE[report.output_type];
        if (!allowedKinds.includes(fileKind)) {
            return NextResponse.json(
                { success: false, error: `file_kind "${fileKind}" is not valid for output_type "${report.output_type}". Allowed: ${allowedKinds.join(', ')}` },
                { status: 400 }
            );
        }

        const file = data.get('file') as File | null;
        if (!file) {
            return NextResponse.json({ success: false, error: "file is required" }, { status: 400 });
        }

        const uploadResult = await uploadReportFile(file, fileKind);
        if (!uploadResult.success) {
            return NextResponse.json({ success: false, error: uploadResult.error, validationErrors: uploadResult.validationErrors }, { status: 400 });
        }

        const user = await getCurrentUser();

        const previousCurrent = await prisma.report_files.findFirst({
            where: { report_id: params.id, file_kind: fileKind, is_current: true },
        });

        const nextVersion = previousCurrent
            ? (parseFloat(previousCurrent.version) + 0.1).toFixed(1)
            : '1.0';

        await prisma.$transaction(async (tx) => {
            if (previousCurrent) {
                await tx.report_files.update({
                    where: { id: previousCurrent.id },
                    data: { is_current: false },
                });
            }
            await tx.report_files.create({
                data: {
                    id: faker.string.uuid(),
                    report_id: params.id,
                    file_kind: fileKind,
                    file_path: uploadResult.data.filePath,
                    file_name: uploadResult.data.fileName,
                    file_type: uploadResult.data.fileType,
                    file_size: uploadResult.data.fileSize,
                    version: nextVersion,
                    is_current: true,
                    uploaded_by: user?.id as string,
                },
            });
        });

        await syncReportFileCache(params.id);

        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'report',
            entityId: params.id,
            description: `Uploaded ${fileKind} v${nextVersion} for report ${params.id}`,
        });

        return NextResponse.json({ success: true, data: { version: nextVersion } }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/[id]/files?fileKind=BLANK_FORM — remove the current file
 * of that kind. Not blocked even if it's the last file of a kind output_type
 * requires — the report just shows "no file" in preview/download until a new
 * one is uploaded (MVP decision, see document/phase2-plan.md §Sub-phase 2b).
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const fileKindValidate = fileKindZod.safeParse(req.nextUrl.searchParams.get('fileKind'));
        if (!fileKindValidate.success) {
            return NextResponse.json({ success: false, error: "Invalid or missing fileKind query param" }, { status: 400 });
        }

        const current = await prisma.report_files.findFirst({
            where: { report_id: params.id, file_kind: fileKindValidate.data, is_current: true },
        });
        if (!current) {
            return NextResponse.json({ success: false, error: "No current file of that kind" }, { status: 404 });
        }

        await prisma.report_files.delete({ where: { id: current.id } });
        await deleteReportFile(current.file_path);

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'delete',
            entity: 'report',
            entityId: params.id,
            description: `Deleted ${fileKindValidate.data} for report ${params.id}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
