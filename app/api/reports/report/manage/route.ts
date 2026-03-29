import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import z from 'zod';
import { convertToWebp, getFileExtension, getImageMetadata } from '@/lib/imageConvert';
import { uploadImageFile, uploadMultipleImages } from '@/lib/fileUploadServices';
import { ReportCreateDataType, ReportGetDataType } from '@/lib/types';
import { faker } from '@faker-js/faker';

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

        const reports = await prisma.reports.findMany({
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
            }
        })

        if (!reports) {
            return NextResponse.json({ success: false, error: "reports not found" }, { status: 404 });
        }
        // console.log(users);
        return NextResponse.json({ success: true, data: reports }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error)
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
    status: z.string().min(1, "Status is required"),
    access_level: z.array(z.string()).min(1, "Access level is required"),
    is_downloadable: z.boolean(),
    is_editable: z.boolean()
})

export async function POST(req: NextRequest) {
    const fileDes = {
        file_path: "",
        file_name: "",
        file_type: "",
        file_size: "",
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
        console.log(data);
        const validate = reportZod.safeParse({
            code: data.get("code") as string,
            name_th: data.get("name") as string,
            description: data.get("description") as string,
            categories: data.get("categories") as string,
            departments: data.get("departments") as string,
            status: data.get("status") as string,
            access_level: JSON.parse(data.get("access_level") as string),
            is_downloadable: data.get("is_downloadable") === 'true' ? true : false,
            is_editable: data.get("is_editable") === 'true' ? true : false,
        });
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }

        // get role id from access_level
        const accessLevel = data.get("access_level") as string;
        const roleIds = await prisma.roles.findMany({
            where: {
                name: {
                    in: JSON.parse(accessLevel)
                }
            },
            select: {
                id: true
            }
        })

        // Multiple files
        if (files.length > 1) {
            const multipleFiles = await uploadMultipleImages(files)
            if (!multipleFiles) {
                return NextResponse.json({ success: false, error: "Failed to upload files" }, { status: 500 });
            }
            fileDes.file_path = multipleFiles?.data?.filePath;
            fileDes.file_name = multipleFiles?.data?.fileName;
            fileDes.file_type = '';
            fileDes.file_size = multipleFiles?.data?.size;
        } else {
            // Single file
            const file = files[0];
            const singleFile = await uploadImageFile(file)
            console.log(singleFile)
            if (!singleFile) {
                return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 });
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
            status: data.get("status") as string,
            is_downloadable: data.get("is_downloadable") === 'true' ? true : false,
            is_editable: data.get("is_editable") === 'true' ? true : false,
            created_at: new Date(),
            updated_at: new Date(),
            report_date: new Date(),
            published_at: data.get("status") === 'PUBLISHED' ? new Date() : null,
        }

        const report = await prisma.reports.create({
            data: createParams
        })
        if (!report) {
            return NextResponse.json({ success: false, error: "Failed to create report" }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: { id: report.id } }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}