import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import redis from './redis';

const ISSUER = 'RFS Report Finder';
const BACKUP_CODE_COUNT = 10;
const PENDING_2FA_TTL_SECONDS = 300;

/**
 * Ephemeral "password verified, awaiting 2FA code" state, keyed by a random
 * token handed to the client. Deliberately fails CLOSED, not open, unlike
 * lib/rate-limit.ts's fail-open design - rate limiting is defense-in-depth,
 * but withholding a full session pending 2FA verification is the actual
 * security boundary here, so a Redis outage must not silently grant one.
 */
export async function createPendingTwoFactorToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(24).toString('hex');
  await redis.set(`pending2fa:${token}`, userId, 'EX', PENDING_2FA_TTL_SECONDS);
  return token;
}

export async function consumePendingTwoFactorUserId(token: string): Promise<string | null> {
  const key = `pending2fa:${token}`;
  const userId = await redis.get(key);
  return userId;
}

export async function deletePendingTwoFactorToken(token: string): Promise<void> {
  await redis.del(`pending2fa:${token}`);
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpauthUrl(secret: string, username: string): string {
  return authenticator.keyuri(username, ISSUER, secret);
}

export async function buildQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotp(secret: string, code: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

/** 10 single-use recovery codes, formatted xxxx-xxxx. Returns both the
 * plaintext (shown to the user exactly once) and their bcrypt hashes
 * (what actually gets stored). */
export async function generateBackupCodes(): Promise<{ plaintext: string[]; hashes: string[] }> {
  const plaintext = Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
  const hashes = await Promise.all(plaintext.map((code) => bcrypt.hash(code, 10)));
  return { plaintext, hashes };
}

export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
