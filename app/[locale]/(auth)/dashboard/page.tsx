import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import { ContentLayout } from '@/components/layouts/content-layout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import DashboardAnalytics from './components/DashboardAnalytics';

const ADMIN_ROLES = ['admin', 'super_admin'];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) {
    redirect({ href: '/login', locale });
    return;
  }

  const t = await getTranslations('dashboard');
  const isAdmin = ADMIN_ROLES.includes(user.roles?.name?.toLowerCase() ?? '');

  return (
    <ContentLayout title={t('pageTitle')}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">{t('breadcrumbHome')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('pageTitle')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isAdmin ? (
        <DashboardAnalytics />
      ) : (
        <div className="space-y-6 mt-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{t('welcomeTitle')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('welcomeBack', { name: user.first_name ?? '' })}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('findReportsTitle')}</CardTitle>
              <CardDescription>{t('findReportsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports/report-list" className="text-sm text-primary underline underline-offset-4">
                {t('goToReportList')}
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </ContentLayout>
  );
}
