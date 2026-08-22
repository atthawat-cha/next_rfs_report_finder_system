import { NextRequest, NextResponse } from 'next/server';
import { createToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import { getClientIp } from '@/lib/request-info';
import {
  consumePendingTwoFactorUserId,
  deletePendingTwoFactorToken,
  verifyTotp,
  verifyBackupCode,
} from '@/lib/two-factor';
import { z } from 'zod';
import logger from '@/lib/logger';

const verifyZod = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(1),
});

/**
 * POST /api/auth/login/verify-2fa — second step of login when the account
 * has 2FA enabled. Shares the same IP-keyed rate limiter as the main login
 * endpoint (a 6-digit TOTP code is only 1,000,000 combinations - brute-
 * forceable within its 30s validity window if unthrottled).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'คุณพยายามยืนยันตัวตนหลายครั้งเกินไป โปรดลองใหม่อีกครั้งในภายหลัง' },
      { status: 429, headers: { 'Retry-After': retryAfter?.toString() || '0' } }
    );
  }

  try {
    const body = await req.json();
    const validated = verifyZod.parse(body);

    const userId = await consumePendingTwoFactorUserId(validated.pendingToken);
    if (!userId) {
      return NextResponse.json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, first_name: true, password: true, department_id: true,
        two_factor_secret: true,
        roles: { select: { id: true, name: true } },
      },
    });
    if (!user || !user.two_factor_secret) {
      return NextResponse.json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }

    let verified = verifyTotp(user.two_factor_secret, validated.code);

    if (!verified) {
      const unusedBackupCodes = await prisma.two_factor_backup_codes.findMany({
        where: { user_id: user.id, used_at: null },
      });
      for (const backupCode of unusedBackupCodes) {
        if (await verifyBackupCode(validated.code, backupCode.code_hash)) {
          await prisma.two_factor_backup_codes.update({
            where: { id: backupCode.id },
            data: { used_at: new Date() },
          });
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      await logActivity(req, {
        userId: user.id,
        action: 'login_failed',
        entity: 'auth',
        entityId: user.id,
        description: `Failed 2FA verification for "${user.username}"`,
      });
      return NextResponse.json({ error: 'รหัสไม่ถูกต้อง' }, { status: 401 });
    }

    // Single-use: consumed on success, kept on failure to allow retry within the TTL window.
    await deletePendingTwoFactorToken(validated.pendingToken);
    await resetRateLimit(ip);

    const token = await createToken({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      password: user.password,
      department_id: user.department_id,
      roles: user.roles,
    });
    await setAuthCookie(token);

    await logActivity(req, {
      userId: user.id,
      action: 'login',
      entity: 'auth',
      entityId: user.id,
      description: `User "${user.username}" logged in (2FA)`,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.first_name,
          role: user.roles,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    logger.error({ error }, 'verify-2fa error');
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการยืนยันตัวตน' }, { status: 500 });
  }
}
