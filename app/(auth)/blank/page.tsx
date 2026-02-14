import { ContentLayout } from "@/components/layouts/content-layout";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";

export default function BlankPage() {
  return (
    <ContentLayout title="Blank Page">
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
          <h1 className="text-3xl md:text-4xl font-bold">Blank Page</h1>
          <p className="text-muted-foreground mt-2">
            นี่คือหน้าเปล่า คุณสามารถเริ่มพัฒนา features ต่างๆ ได้จากที่นี่
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 border rounded-lg">
            <h2 className="text-xl font-semibold">พื้นที่สำหรับพัฒนา</h2>
            <p className="text-sm text-muted-foreground mt-1">
              เพิ่ม features และ components ของคุณที่นี่
            </p>
          </div>
        </div>
      </div>
    </ContentLayout>
  );
}