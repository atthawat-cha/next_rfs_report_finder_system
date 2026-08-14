import { NextRequest, NextResponse } from 'next/server';
import { deleteAuthCookie, getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  try {
    // ต้องอ่าน user ก่อน deleteAuthCookie() — หลังจากนั้นไม่เหลืออะไรระบุตัวผู้ใช้แล้ว
    const user = await getCurrentUser();

    // Delete auth cookie
    await deleteAuthCookie();

    await logActivity(request, {
      userId: user?.id ?? null,
      action: 'logout',
      entity: 'auth',
      entityId: user?.id,
      description: user ? `User "${user.username}" logged out` : 'Logout without an active session',
    });

    return NextResponse.json(
      { success: true, message: 'ออกจากระบบสำเร็จ' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการออกจากระบบ' },
      { status: 500 }
    );
  }
}
