import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest,{ params }: { params: { id: string } }) {
  try {
    

    const user = await prisma.users.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        department_id: true,
        created_at: true,
        updated_at: true,
      },
});


    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
