import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { resolveReportAcl } from '@/lib/report-acl';
import { resolveStoredFile } from '@/lib/storage-path';

const MAX_PREVIEW_ROWS = 200;
const SPREADSHEET_EXTS = new Set(['xlsx', 'xls', 'csv']);

interface PreviewTable {
    headers: string[];
    rows: string[][];
}

/**
 * GET /api/reports/[id]/files/[fileId]/preview — parses a SAMPLE_DATA file
 * server-side (exceljs for xlsx/xls, plain split for csv) and returns the
 * first MAX_PREVIEW_ROWS rows as JSON. Kept server-side rather than shipping
 * exceljs to the client - it's a Node-oriented library, and this keeps the
 * response size bounded regardless of the real file's size (this is a
 * preview, not an export; the full file is still available via download).
 */
export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string; fileId: string }> }
) {
    const params = await props.params;
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const isAdmin = routeAcceptted('admin').includes(authResult.user.roles?.name?.toLowerCase() ?? '');

        const report = await prisma.reports.findUnique({
            where: { id: params.id },
            select: { id: true },
        });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        if (!isAdmin) {
            const acl = await resolveReportAcl(params.id, authResult.user);
            if (!acl.can_export) {
                return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
            }
        }

        const file = await prisma.report_files.findFirst({
            where: { id: params.fileId, report_id: params.id, is_current: true },
        });
        if (!file) {
            return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
        }

        const ext = path.extname(file.file_name || file.file_path).replace('.', '').toLowerCase();
        if (!SPREADSHEET_EXTS.has(ext)) {
            return NextResponse.json({ success: false, error: `File type ".${ext}" is not previewable as a table` }, { status: 400 });
        }

        let fileBuffer: Buffer;
        try {
            const absolutePath = await resolveStoredFile(file.file_path);
            fileBuffer = await fs.readFile(absolutePath);
        } catch {
            return NextResponse.json({ success: false, error: "File not found on server" }, { status: 404 });
        }

        const table = ext === 'csv' ? parseCsv(fileBuffer) : await parseSpreadsheet(fileBuffer);

        return NextResponse.json({ success: true, data: table }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function parseSpreadsheet(buffer: Buffer): Promise<PreviewTable> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { headers: [], rows: [] };

    const headerRow = sheet.getRow(1);
    const headers = (headerRow.values as unknown[]).slice(1).map((v) => cellToString(v));

    const rows: string[][] = [];
    for (let i = 2; i <= sheet.rowCount && rows.length < MAX_PREVIEW_ROWS; i++) {
        const row = sheet.getRow(i);
        rows.push((row.values as unknown[]).slice(1).map((v) => cellToString(v)));
    }
    return { headers, rows };
}

function parseCsv(buffer: Buffer): PreviewTable {
    const lines = buffer.toString('utf-8').split(/\r?\n/).filter((l) => l.length > 0);
    const [headerLine, ...dataLines] = lines;
    const headers = (headerLine ?? '').split(',');
    const rows = dataLines.slice(0, MAX_PREVIEW_ROWS).map((line) => line.split(','));
    return { headers, rows };
}

function cellToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
        return String((value as { text: unknown }).text ?? '');
    }
    if (value instanceof Date) return value.toISOString();
    return String(value);
}
