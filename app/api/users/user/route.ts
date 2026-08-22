import prisma from '@/lib/prisma';
import { faker } from '@faker-js/faker';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserStatus } from '@/app/generated/prisma/enums';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { passwordPolicySchema } from '@/lib/password-policy';
import logger from '@/lib/logger';
import { parsePagination } from '@/lib/pagination';

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

    const searchParams = req.nextUrl.searchParams;
    // Paginated only when explicitly requested - the user-select combobox
    // (reportPermissionsDrawer.tsx, report-edit's share picker) has no
    // server-side search yet and depends on getting every user back.
    const isPaged = searchParams.has('page') || searchParams.has('pageSize');
    const { page, pageSize, skip, take } = await parsePagination(searchParams);

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          department_id: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
        ...(isPaged ? { skip, take } : {}),
      }),
      prisma.users.count(),
    ]);

    const meta = isPaged
      ? { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      : { page: 1, pageSize: total, total, totalPages: 1 };
    return NextResponse.json({ success: true, data: users, meta }, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'GET /api/users/user failed');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bad Request" },
      { status: 400 }
    )
  }
}

const userZod = z.object({
  username: z.string().min(3, 'กรุณากรอกชื่อผู้ใช้'),
  password: passwordPolicySchema,
  first_name: z.string().min(1, 'กรุณากรอกชื่อ'),
  last_name: z.string().min(1, 'กรุณากรอกนามสกุล'),
  department_id: z.string().min(1, 'กรุณาเลือกหน่วยงาน'),
  role_id: z.string().min(3, 'Plase choose role'),
  status: z.string().min(1, 'กรุณาเลือกสถานะ')
})

export async function POST(req: NextRequest) {
  try {
    const acceptedRoles = routeAcceptted('admin');
    // ตรวจสอบการยืนยันตัวตนก่อนสร้างผู้ใช้
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await requireRole(req, acceptedRoles);

    if (authResult instanceof NextResponse) {
      return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
    }

    const body = await req.json();
    const validatedData = userZod.parse(body);
    const user = await prisma.users.create({
      data: {
        id: faker.string.uuid(),
        username: validatedData.username,
        email: validatedData.username,
        password: await bcrypt.hash(validatedData.password, 10),
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        department_id: validatedData.department_id,
        status: UserStatus.ACTIVE,
        role_id: validatedData.role_id,
        created_at: new Date(),
        updated_at: new Date(),
        password_changed_at: new Date(),
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }
    await logActivity(req, {
      userId: authResult.user?.id,
      action: 'create',
      entity: 'user',
      entityId: user.id,
      description: `Created user "${user.username}"`,
    });

    return NextResponse.json({ success: true, data: user.id }, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'POST /api/users/user failed');
    return NextResponse.json(
      { error: "Invalid input", details: String(error) },
      { status: 400 }
    );
  }

}


// export async function GET(req: NextRequest, res: NextResponse) {
//   const { method, query, body } = await req.json();
//       try {
//         const users = await prisma.users.findMany({});

//         console.log(users);
//         return NextResponse.json({success: true, data: users}, { status: 200 });
//       } catch (error) {
//         return NextResponse.json(
//         { error: console.error()},
//         { status: 400 }
//       );
//       }

//     // case 'POST':
//     //   try {
//     //     const { name, email, password } = body;
//     //     const user = await prisma.users.create({
//     //       data: {
//     //         name,
//     //         email,
//     //         password: await bcrypt.hash(password, 10),
//     //       },
//     //     });
//     //     res.status(201).json(user);
//     //   } catch (error) {
//     //     res.status(500).json({ message: error.message });
//     //   }
//     //   break;
//     // case 'PUT':
//     //   try {
//     //     const { id } = query;
//     //     const { name, email, password } = body;
//     //     const user = await prisma.users.update({
//     //       where: {
//     //         id,
//     //       },
//     //       data: {
//     //         name,
//     //         email,
//     //         password: password ? await bcrypt.hash(password, 10) : undefined,
//     //       },
//     //     });
//     //     res.status(200).json(user);
//     //   } catch (error) {
//     //     res.status(500).json({ message: error.message });
//     //   }
//     //   break;
//     // case 'DELETE':
//     //   try {
//     //     const { id } = query;
//     //     await prisma.users.delete({
//     //       where: {
//     //         id,
//     //       },
//     //     });
//     //     res.status(204).json({ message: 'User deleted successfully' });
//     //   } catch (error) {
//     //     res.status(500).json({ message: error.message });
//     //   }
//     //   break;
//       return NextResponse.json({ error:`Method ${method} Not Allowed`  }, { status: 405 });
// }
