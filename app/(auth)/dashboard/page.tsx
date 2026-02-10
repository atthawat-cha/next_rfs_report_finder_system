import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { ContentLayout } from '@/components/layouts/content-layout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

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
                <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbPage>Users</BreadcrumbPage>
            </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              ยินดีต้อนรับกลับมา, {user.name}!
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>ยินดีต้อนรับ</CardTitle>
                <CardDescription>นี่คือหน้า Dashboard ของคุณ</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  คุณสามารถเริ่มพัฒนา features ต่างๆ ได้จากที่นี่
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลผู้ใช้</CardTitle>
                <CardDescription>ข้อมูลบัญชีของคุณ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">ชื่อ</p>
                  <p className="text-sm text-muted-foreground">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">อีเมล</p>
                  <p className="text-sm text-muted-foreground">{user.username}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>เริ่มต้นใช้งาน</CardTitle>
                <CardDescription>ขั้นตอนถัดไป</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>✅ เข้าสู่ระบบสำเร็จ</li>
                  <li>✅ เข้าถึง Dashboard</li>
                  <li>🔨 เริ่มพัฒนา features</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>พื้นที่สำหรับพัฒนา</CardTitle>
              <CardDescription>
                เพิ่ม features และ components ของคุณที่นี่
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  พื้นที่ว่างสำหรับ features ของคุณ
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  แก้ไขไฟล์ <code className="bg-muted px-2 py-1 rounded">app/dashboard/page.tsx</code> เพื่อเริ่มต้น
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
    </ContentLayout>
  );
}
