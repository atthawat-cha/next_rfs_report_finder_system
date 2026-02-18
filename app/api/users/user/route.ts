import { PrismaClient } from '@/app/generated/prisma/client';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserCreateType } from '@/lib/types';
import {UserStatus} from "@/app/generated/prisma/client";
import { faker } from '@faker-js/faker';



export async function GET(req:NextRequest){
  try {
    const body = await req.json();
    
    const users = await prisma.users.findMany({});
    return NextResponse.json({success: true, data: users}, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: console.error()},
      { status: 400 }
    )
  }
}

  const userZod = z.object({
    username: z.string().min(3, 'กรุณากรอกชื่อผู้ใช้'),
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
    first_name: z.string().min(1, 'กรุณากรอกชื่อ'),
    last_name: z.string().min(1, 'กรุณากรอกนามสกุล'),
    department_id: z.string().min(1, 'กรุณาเลือกหน่วยงาน'),
    status: z.string().min(1, 'กรุณาเลือกสถานะ')
  })

export async function POST(req:NextRequest){
  try {

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
        created_at: new Date(),
        updated_at: new Date()
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }
    return NextResponse.json({success: true, data: user.id}, { status: 200 });
  } catch (error) {
    console.error(error);
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
