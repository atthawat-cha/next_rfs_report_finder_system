import { NextRequest } from 'next/server';

/**
 * ดึง client IP จาก request
 * ใช้ร่วมกันระหว่าง rate limiter (lib/auth.ts) และ activity logger (lib/activity-log.ts)
 *
 * `NextRequest.ip` ถูกลบออกใน Next.js 15 (ไม่เคย populate เองมาก่อนแล้วนอก
 * Vercel deployment) — header เป็นแหล่งเดียวที่ใช้ได้จริงตั้งแต่ต้น
 */
export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.headers.get('x-real-ip') || 'unknown';
}
