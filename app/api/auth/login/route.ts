import { NextRequest, NextResponse } from 'next/server';
import { authenticate, createToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import { getClientIp } from '@/lib/request-info';

const loginSchema = z.object({
  username: z.string().min(3, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export async function POST(request: NextRequest) {

  // ตรวจสอบ rate limit
  const ip = getClientIp(request);
  const {allowed, retryAfter} = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'คุณพยายามเข้าสู่ระบบหลายครั้งเกินไป โปรดลองใหม่อีกครั้งในภายหลัง' },
      { status: 429, headers: { 'Retry-After': retryAfter?.toString() || '0' } }
    );
  }

  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);

    const getUser = await prisma.users.findUnique({
      where: {
        username: validatedData.username,
      },
      select:{
        id:true,
        username:true,
        password:true,
        first_name:true,
        department_id:true,
        roles:{
          select:{
            id:true,
            name:true
          }
        }
      },
      
    });

    // const getUser = await prisma.users.findUnique({
    //   include:{
    //     roles:{
    //       include:{
    //         role_permissions:{
    //           include:{
    //             permissions:{
    //               include:{
    //                 menu_permissions:{
    //                   include:{
    //                     menus:true
    //                   }
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //     },
    //   },
    //   where: {
    //     username: validatedData.username,
    //   },
    // });

    if (!getUser) {
      // username ไม่มีในระบบ — ไม่มี user id ให้ผูก log
      await logActivity(request, {
        userId: null,
        action: 'login_failed',
        entity: 'auth',
        description: `Failed login attempt: unknown username "${validatedData.username}"`,
      });
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Authenticate user
    const user = await authenticate(validatedData, getUser);

    if (!user) {
      // username ถูก แต่รหัสผ่านผิด — ผูก log กับ user ที่หาเจอได้
      await logActivity(request, {
        userId: getUser.id,
        action: 'login_failed',
        entity: 'auth',
        entityId: getUser.id,
        description: `Failed login attempt: wrong password for "${validatedData.username}"`,
      });
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await createToken(user);

    // Set cookie
    await setAuthCookie(token);

    // Reset rate limit on successful login
    await resetRateLimit(ip);

    await logActivity(request, {
      userId: user.id,
      action: 'login',
      entity: 'auth',
      entityId: user.id,
      description: `User "${user.username}" logged in`,
    });

    return NextResponse.json(
      { 
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.first_name,
          role: user.roles, // Assuming you want to return role names
        }
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
