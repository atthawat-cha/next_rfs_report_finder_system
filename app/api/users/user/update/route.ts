import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { UserStatus } from "@/app/generated/prisma/enums";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getAuthFromRequest, requireRole, routeAcceptted } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { passwordPolicySchema } from "@/lib/password-policy";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  const schema = z.object({
    id: z.string(),

    username: z.string().min(3).optional(),
    // users.email is NOT NULL in the schema - was `.nullable()` here, which
    // let a client send email: null through untouched (updateData was `any`
    // so nothing caught it before hitting the DB's NOT NULL constraint).
    email: z.string().email().optional(),
    password: passwordPolicySchema.optional(),

    first_name: z.string().optional(),
    last_name: z.string().optional(),
    department_id: z.string().optional(),
    // users.status is the UserStatus enum, not a free-form string - was
    // z.string() here, so an invalid value only failed at the DB layer with
    // a generic "Update failed" instead of a clean 400.
    status: z.nativeEnum(UserStatus).optional(),
  });

  try {
    const acceptedRoles = routeAcceptted('admin');
    // ตรวจสอบการยืนยันตัวตนก่อนแก้ไขผู้ใช้
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await requireRole(req, acceptedRoles);

    if (authResult instanceof NextResponse) {
      return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
    }

    const body = await req.json();

    const data = schema.parse(body);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    if (!data.id) {
      return NextResponse.json(
        { success: false, error: "Invalid input user id not found" },
        { status: 400 }
      );
    }

    // build update object dynamically - Unchecked variant because
    // department_id is set as a plain FK scalar here, not via a relation connect
    const updateData: Prisma.usersUncheckedUpdateInput = {
      username: data.username,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      department_id: data.department_id,
      status: data.status,
      updated_at: new Date(),
    };

    // remove undefined fields
    (Object.keys(updateData) as (keyof typeof updateData)[]).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    // hash password if provided
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
      updateData.password_changed_at = new Date();
    }

    const user = await prisma.users.update({
      where: { id: data.id },
      data: updateData,
    });

    await logActivity(req, {
      userId: authResult.user?.id,
      action: 'update',
      entity: 'user',
      entityId: user.id,
      description: `Updated user "${user.username}"`,
      metadata: { fields: Object.keys(updateData) },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });

  } catch (error) {
    logger.error({ error }, 'PUT /api/users/user/update failed');

    return NextResponse.json(
      { success: false, error: "Update failed" },
      { status: 400 }
    );
  }
}
