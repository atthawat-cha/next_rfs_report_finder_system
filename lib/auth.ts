import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET
);

export interface User {
  id: string;
  username: string;
  first_name: string | null;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface JWTPayload {
  user: User;
  exp: number;
}

// Demo users - ในการใช้งานจริงควรใช้ database
const DEMO_USERS = [
  {
    id: '1',
    username: 'admin1',
    password: '$2y$10$xkt6qDTBQ1PDfMw2Fl5SyuXzJl1fLRuA4y2Zf6sICAPwZQ7Wmsyze', // password: admin123
    name: 'Admin User',
  },
  {
    id: '2',
    username: 'user1',
    password: '$2y$10$xkt6qDTBQ1PDfMw2Fl5SyuXzJl1fLRuA4y2Zf6sICAPwZQ7Wmsyze', // password: admin123
    name: 'Demo User',
  },
];


// สร้าง JWT token
export async function createToken(user: User): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

// ตรวจสอบ JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    
    return verified.payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

// ดึงข้อมูล user จาก token
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    return payload?.user || null;
  } catch (error) {
    return null;
  }
}

// ตรวจสอบ credentials และ login
export async function authenticate(loginUser: LoginRequest, user: User): Promise<User | null> {
  // const users = DEMO_USERS.find((u) => u.username === username);  
  if (!loginUser.username || !loginUser.password) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(loginUser.password, user.password);

  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    password: user.password
  };
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Delete auth cookie
export async function deleteAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

// ตรวจสอบ authentication จาก request
export async function getAuthFromRequest(request: NextRequest): Promise<User | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    return payload?.user || null;
  } catch (error) {
    return null;
  }
}
