import { NextRequest, NextResponse } from 'next/server';
import { deleteAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Delete auth cookie
    await deleteAuthCookie();

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
