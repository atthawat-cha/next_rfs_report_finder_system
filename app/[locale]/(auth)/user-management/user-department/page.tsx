'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Link } from '@/i18n/navigation'
import React from 'react'

//  Data Table
import { DeptDataTable } from './dept-data-table'
import { DepartmentType } from '@/lib/types'
import { getDepartmentColumns } from './dep-columns'
import { DrawerDialogDemo } from '@/components/shared/dialog-drawer'
import toast from 'react-hot-toast'
import DeptForm from './components/deptForm'
import { SkeletonTable } from '@/components/shared/skeletonTable'
import { useTranslations } from 'next-intl'

export default function UserDepartment() {
  const t = useTranslations('userManagement.department');
  const tc = useTranslations('common');
  const columns = React.useMemo(() => getDepartmentColumns(t, tc), [t, tc]);

  const [deptData, setDeptData] = React.useState<DepartmentType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openDialog] = React.useState(false);

  const fetchDepartments = React.useCallback(async () => {
    try {
      const response = await fetch('/api/users/departments');
      if (!response.ok && response.status !== 403 && response.status !== 404) {
        throw new Error('Failed to fetch departments');
      }

      if (response.status === 403) {
        return toast.error(t("forbidden"));
      }

      if (response.status === 404) {
        setDeptData([]);
        return;
      }

      const data = await response.json();
      if (data?.success) setDeptData(data.data);

    } catch (error) {
      console.log('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments])


  return (
    <ContentLayout title={t("pageTitle")}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">{tc("breadcrumbDashboard")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">{t("breadcrumbManagement")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("breadcrumbDepartment")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="container mx-auto py-10 gap-6">
        <div className="flex items-center justify-between">
          <h5 className="text-xl md:text-3xl font-bold">{t("listTitle")}</h5>
          <DrawerDialogDemo isOpen={openDialog} title={t("newDialogTitle")} description={t("newDialogDescription")} btnText={t("newButtonText")}>
            <DeptForm />
          </DrawerDialogDemo>
        </div>
        <Separator className="my-5" />
        {loading ? <SkeletonTable /> : <DeptDataTable columns={columns} data={deptData} />}
      </div>
    </ContentLayout>
  );
}



