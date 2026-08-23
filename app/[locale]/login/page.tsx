'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// notifcation
import toast from 'react-hot-toast';

function LoginContent() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [orgName, setOrgName] = useState('');

  // ORG_NAME (Phase 5e) - GET /api/settings/system is admin-only, so
  // branding on this pre-auth screen goes through the public settings
  // endpoint instead (same no-auth stance as /api/shares/[token]).
  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.data.org_name) setOrgName(json.data.org_name);
      })
      .catch(() => {});
  }, []);

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
        toast.error(data.error || t('errors.loginFailed'));
        setError(data.error || t('errors.loginFailed'));
        setIsLoading(false);
        return;
      }

      if (data.requires2fa) {
        setPendingToken(data.pendingToken);
        setIsLoading(false);
        return;
      }

      toast.success(t('success.loggedIn'));
      setIsLoading(false);
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error(t('errors.connectionError'));
      setError(t('errors.connectionError'));
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
        toast.error(data.error || t('errors.invalidCode'));
        setError(data.error || t('errors.invalidCode'));
        setIsLoading(false);
        return;
      }

      toast.success(t('success.loggedIn'));
      setIsLoading(false);
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error(t('errors.connectionError'));
      setError(t('errors.connectionError'));
      setIsLoading(false);
    }
  };

  if (pendingToken) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">{t('twoFactor.title')}</CardTitle>
              <CardDescription>
                {t('twoFactor.description')}
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
                  <Label htmlFor="code">{t('twoFactor.codeLabel')}</Label>
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
                  {isLoading ? t('twoFactor.submitting') : t('twoFactor.submit')}
                </Button>
                <button
                  type="button"
                  className="text-sm text-center text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => { setPendingToken(null); setCode(''); setError(''); }}
                >
                  {t('twoFactor.backToLogin')}
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
            {orgName && <p className="text-sm font-medium text-muted-foreground">{orgName}</p>}
            <CardTitle className="text-2xl font-bold">{t('login.title')}</CardTitle>
            <CardDescription>
              {t('login.description')}
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
                <Label htmlFor="username">{t('login.usernameLabel')}</Label>
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
                <Label htmlFor="password">{t('login.passwordLabel')}</Label>
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
                <p className="font-medium">{t('login.testCredentialsLabel')}</p>
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
                {isLoading ? t('login.submitting') : t('login.submit')}
              </Button>

              <div className="text-sm text-center text-muted-foreground">
                <Link href="/" className="hover:text-primary transition-colors">
                  {t('login.backToHome')}
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
  const t = useTranslations('auth');
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">{t('login.loading')}</div>}>
      <LoginContent />
    </Suspense>
  );
}
