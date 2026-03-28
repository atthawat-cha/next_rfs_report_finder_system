import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import z from 'zod';
import { convertToWebp, getFileExtension, getImageMetadata } from '@/lib/imageConvert';
import { uploadImageFile, uploadMultipleImages } from '@/lib/fileUploadServices';

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
    users: z.string().min(1, "Users is required"),
    status: z.string().min(1, "Status is required"),
    access_level: z.array(z.string()).min(1, "Access level is required"),
    is_downloadable: z.boolean(),
    is_editable: z.boolean()
})

export async function POST(req: NextRequest) {
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
        const user = getCurrentUser();
        console.log(user);
        console.log(data);
        const files = data.getAll("files") as File[];
        if (!files) {
            return NextResponse.json({ success: false, error: "Files is required" }, { status: 400 });
        }

        // Multiple files
        if (files.length > 1) {
            const multipleFiles = await uploadMultipleImages(files)
            if (!multipleFiles) {
                return NextResponse.json({ success: false, error: "Failed to upload files" }, { status: 500 });
            }
        } else {
            // Single file
            const file = files[0];
            const singleFile = await uploadImageFile(file)
            if (!singleFile) {
                return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 });
            }
        }

        // get role id from access_level
        const accessLevel = data.get("access_level") as string;
        const roleIds = await prisma.roles.findMany({
            where: {
                name: {
                    in: accessLevel.split(",")
                }
            },
            select: {
                id: true
            }
        })

        console.log(roleIds);

        // const validate = reportZod.safeParse(body);
        // if (!validate.success) {
        //     return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        // }

        // const report = await prisma.reports.create({
        //     data: {}
        // })
        return NextResponse.json({ success: true, data: report }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}