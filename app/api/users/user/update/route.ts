import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const schema = z.object({
    id: z.string(),

    username: z.string().min(3).optional(),
    email: z.string().email().nullable().optional(),
    password: z.string().min(1).optional(),

    first_name: z.string().optional(),
    last_name: z.string().optional(),
    department_id: z.string().optional(),
    status: z.string().optional(),
  });

  try {
    const body = await req.json();

    const data = schema.parse(body);

    // build update object dynamically
    const updateData: any = {
      username: data.username,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      department_id: data.department_id,
      status: data.status,
      updated_at: new Date(),
    };

    // remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // hash password if provided
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.users.update({
      where: { id: data.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: user,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: "Update failed" },
      { status: 400 }
    );
  }
}
