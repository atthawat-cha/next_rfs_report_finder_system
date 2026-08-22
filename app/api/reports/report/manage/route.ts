import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import z from 'zod';
import { uploadImageFile, uploadMultipleImages } from '@/lib/fileUploadServices';
import { faker } from '@faker-js/faker';
import { parsePagination } from '@/lib/pagination';
import { logActivity } from '@/lib/activity-log';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/reports/report/manage
 * @param req NextRequest
 * @returns NextResponse
 * 
 */
export async function GET(req: NextRequest) {
    try {
        const acceptedRoles = routeAcceptted('admin');
        // ตรวจสอบการยืนยันตัวตนก่อนเข้าถึงข้อมูล
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, acceptedRoles);

        if (authResult instanceof NextResponse) {
            return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
        }

        // NOTE: default pageSize = 100 — ฝั่ง frontend ยังไม่ส่ง page/pageSize (Phase 1 จะเพิ่ม UI)
        // ดังนั้นเมื่อจำนวนรายงานจริงเกิน 100 endpoint นี้จะตัดข้อมูลเงียบ ๆ จนกว่าจะทำ Phase 1
        const { page, pageSize, skip, take } = await parsePagination(req.nextUrl.searchParams);

        const [reports, total] = await Promise.all([
            prisma.reports.findMany({
                select: {
                    id: true,
                    code: true,
                    name_th: true,
                    name_en: true,
                    description: true,
                    file_path: true,
                    file_name: true,
                    categories: { select: { id: true, name: true } },
                    departments: { select: { id: true, name: true } },
                    users: { select: { id: true, username: true } },
                    created_at: true,
                    status: true,
                    updated_at: true,
                    is_downloadable: true,
                    is_editable: true
                },
                skip,
                take
            }),
            prisma.reports.count(),
        ]);

        if (!reports) {
            return NextResponse.json({ success: false, error: "reports not found" }, { status: 404 });
        }
        // console.log(users);
        return NextResponse.json({
            success: true,
            data: reports,
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
        }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


/**
 * POST /api/reports/report/manage
 * @param req NextRequest
 * @returns NextResponse
 * 
 */
const reportZod = z.object({
    code: z.string().min(1, "Code is required"),
    name_th: z.string().min(1, "Name (Thai) is required"),
    description: z.string().min(1, "Description is required"),
    categories: z.string().min(1, "Categories is required"),
    departments: z.string().min(1, "Departments is required"),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    access_level: z.enum(["PUBLIC", "RESTRICTED", "PRIVATE"]),
    output_type: z.enum(["PRINT_FORM", "DATA_REPORT"]),
    is_downloadable: z.boolean(),
    is_editable: z.boolean()
})

export async function POST(req: NextRequest) {
    const fileDes = {
        file_path: "",
        file_name: "",
        file_type: "",
        file_size: 0,
    }
    try {
        const acceptedRoles = routeAcceptted('admin');
        // ตรวจสอบการยืนยันตัวตนก่อนเข้าถึงข้อมูล
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, acceptedRoles);

        if (authResult instanceof NextResponse) {
            return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
        }

        const data = await req.formData();
        const user = await getCurrentUser();
        const files = data.getAll("files") as File[];
        if (!files) {
            return NextResponse.json({ success: false, error: "Files is required" }, { status: 400 });
        }
        const validate = reportZod.safeParse({
            code: data.get("code") as string,
            name_th: data.get("name") as string,
            description: data.get("description") as string,
            categories: data.get("categories") as string,
            departments: data.get("departments") as string,
            status: data.get("status") as string,
            access_level: data.get("access_level") as string,
            output_type: data.get("output_type") as string,
            is_downloadable: data.get("is_downloadable") === 'true' ? true : false,
            is_editable: data.get("is_editable") === 'true' ? true : false,
        });
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }

        // Multiple files — only reports.file_path/file_name/file_size (one slot per
        // report, pre-dates the report_files multi-file model from Phase 2) get
        // populated from the first successfully uploaded file; any others that fail
        // are reported back but don't block report creation.
        if (files.length > 1) {
            const multipleFiles = await uploadMultipleImages(files);
            const primary = multipleFiles.success[0];
            if (!primary) {
                return NextResponse.json(
                    { success: false, error: "Failed to upload files", failed: multipleFiles.failed },
                    { status: 500 }
                );
            }
            fileDes.file_path = primary.filePath;
            fileDes.file_name = primary.fileName;
            fileDes.file_type = '';
            fileDes.file_size = primary.size;
        } else {
            // Single file
            const file = files[0];
            const singleFile = await uploadImageFile(file);
            if (!singleFile.success) {
                return NextResponse.json({ success: false, error: singleFile.error }, { status: 500 });
            }
            fileDes.file_path = singleFile.data.filePath;
            fileDes.file_name = singleFile.data.fileName;
            fileDes.file_type = '';
            fileDes.file_size = singleFile.data.size;
        }

        const createParams = {
            id: faker.string.uuid(),
            code: data.get("code") as string,
            name_th: data.get("name") as string,
            description: data.get("description") as string,
            file_path: fileDes.file_path,
            file_name: fileDes.file_name,
            file_type: fileDes.file_type,
            file_size: fileDes.file_size,
            version: '1.0',
            category_id: data.get("categories") as string,
            department_id: data.get("departments") as string,
            created_by_id: user?.id as string,
            status: validate.data.status,
            access_level: validate.data.access_level,
            output_type: validate.data.output_type,
            is_downloadable: data.get("is_downloadable") === 'true' ? true : false,
            is_editable: data.get("is_editable") === 'true' ? true : false,
            created_at: new Date(),
            updated_at: new Date(),
            report_date: new Date(),
            published_at: validate.data.status === 'PUBLISHED' ? new Date() : null,
        }

        const report = await prisma.reports.create({
            data: createParams
        })
        if (!report) {
            return NextResponse.json({ success: false, error: "Failed to create report" }, { status: 500 });
        }

        await logActivity(req, {
            userId: authResult.user?.id,
            action: 'create',
            entity: 'report',
            entityId: report.id,
            description: `Created report "${report.code}"`,
        });

        return NextResponse.json({ success: true, data: { id: report.id } }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}