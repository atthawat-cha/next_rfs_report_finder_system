import { z } from 'zod';

export const PASSWORD_POLICY_MESSAGE = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว';

/** 8+ chars, at least 1 letter + 1 number - no forced rotation, see document/phase4-plan.md sub-phase 4d. */
export const passwordPolicySchema = z
  .string()
  .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, PASSWORD_POLICY_MESSAGE);
