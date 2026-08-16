import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { ContentLayout } from '@/components/layouts/content-layout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";
import DashboardAnalytics from './components/DashboardAnalytics';

const ADMIN_ROLES = ['admin', 'super_admin'];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const isAdmin = ADMIN_ROLES.includes(user.roles?.name?.toLowerCase() ?? '');

  return (
    <ContentLayout title="Dashboard">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isAdmin ? (
        <DashboardAnalytics />
      ) : (
        <div className="space-y-6 mt-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">ยินดีต้อนรับ</h1>
            <p className="text-muted-foreground mt-2">
              ยินดีต้อนรับกลับมา, {user.first_name}!
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ค้นหารายงาน</CardTitle>
              <CardDescription>เริ่มต้นค้นหารายงานที่คุณต้องการใช้งาน</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports/report-list" className="text-sm text-primary underline underline-offset-4">
                ไปที่หน้ารายการรายงาน
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </ContentLayout>
  );
}
