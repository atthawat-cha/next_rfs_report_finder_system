'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// notifcation
import toast, { Toaster } from 'react-hot-toast';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        setError(data.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        setIsLoading(false);
        return;
      }

      if (data.requires2fa) {
        setPendingToken(data.pendingToken);
        setIsLoading(false);
        return;
      }

      toast.success('เข้าสู่ระบบสําเร็จ');
      setIsLoading(false);
      router.push(redirect);
      router.refresh();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setIsLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pendingToken, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'รหัสไม่ถูกต้อง');
        setError(data.error || 'รหัสไม่ถูกต้อง');
        setIsLoading(false);
        return;
      }

      toast.success('เข้าสู่ระบบสําเร็จ');
      setIsLoading(false);
      router.push(redirect);
      router.refresh();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setIsLoading(false);
    }
  };

  if (pendingToken) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">ยืนยันตัวตนสองขั้นตอน</CardTitle>
              <CardDescription>
                กรอกรหัส 6 หลักจากแอปยืนยันตัวตนของคุณ หรือใช้ backup code
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleVerify2fa}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="code">รหัสยืนยัน</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'กำลังยืนยัน...' : 'ยืนยัน'}
                </Button>
                <button
                  type="button"
                  className="text-sm text-center text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => { setPendingToken(null); setCode(''); setError(''); }}
                >
                  กลับไปเข้าสู่ระบบใหม่
                </button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">เข้าสู่ระบบ</CardTitle>
            <CardDescription>
              กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">ชื่อผู้ใช้</Label>
                <Input
                  id="username"
                  type="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="p-3 text-xs bg-muted rounded-md space-y-1">
                <p className="font-medium">ข้อมูลสำหรับทดสอบ:</p>
                <p>Username: admin</p>
                <p>Password: 123456</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
              
              <div className="text-sm text-center text-muted-foreground">
                <Link href="/" className="hover:text-primary transition-colors">
                  กลับหน้าหลัก
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">กำลังโหลด...</div>}>
      <LoginContent />
    </Suspense>
  );
}
