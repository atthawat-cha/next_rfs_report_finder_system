import { NextRequest, NextResponse } from 'next/server';
import { authenticate, checkRateLimit, createToken, resetRateLimit, setAuthCookie } from '@/lib/auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const loginSchema = z.object({
  username: z.string().min(3, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export async function POST(request: NextRequest) {

  // ตรวจสอบ rate limit
  const ip = request.headers.get('x-forwarded-for') || request.ip || request.headers.get('x-real-ip') || 'unknown';
  const {allowed, retryAfter} = checkRateLimit(ip);
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
      select: {
        id: true,
        username: true,
        first_name: true,
        password: true,
        user_roles: {
          select:{
            roles:{
              select:{
                id: true,
                name: true,
                role_permissions:true,
              },
            }
          }
          // select: {
          //   roles: {
          //     select: {
          //       id: true,
          //       name: true,
          //       role_permissions:{
          //         select: {
          //           id: true,
          //           role_id: true,
          //           permission_id: true,
          //           can_view: true,
          //           can_create: true,
          //           can_update: true,
          //           can_delete: true,
          //                 }
          //                       },
          //               },
          //       }       ,
          //       },
    }},
      where: {
        username: validatedData.username,
      },
    });

    if (!getUser) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Authenticate user
    const user = await authenticate(validatedData, getUser);

    if (!user) {
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
    resetRateLimit(ip);

    

    return NextResponse.json(
      { 
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.first_name,
          role: user.user_roles.roles.map(r => r.name), // Assuming you want to return role names
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
