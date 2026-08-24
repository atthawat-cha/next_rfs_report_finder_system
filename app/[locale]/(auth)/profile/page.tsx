import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ContentLayout } from '@/components/layouts/content-layout';
import { TwoFactorSettings } from '@/components/shared/twoFactorSettings';

interface UserSessionType {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string;
  permissions: string[];
}

export default async function ProfilePage() {
  const user = await getCurrentUser() as UserSessionType;
  const locale = await getLocale();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  const t = await getTranslations('auth.profile');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ContentLayout title={t('pageTitle')}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">{t('heading')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('subheading')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('accountInfoTitle')}</CardTitle>
            <CardDescription>
              {t('accountInfoDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">{user?.username}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('userIdLabel')}</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {user.id}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('nameLabel')}</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {user.name}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('emailLabel')}</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {user.username}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('twoFactorTitle')}</CardTitle>
            <CardDescription>
              {t('twoFactorDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TwoFactorSettings />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
