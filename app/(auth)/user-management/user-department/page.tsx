'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import React from 'react'

//  Data Table
import { DeptDataTable } from './dept-data-table'
import { DepartmentType } from '@/lib/types'
import { department_columns } from './dep-columns'
import { DrawerDialogDemo } from '@/components/shared/dialog-drawer'
import toast from 'react-hot-toast'
import DeptForm from './components/deptForm'
import { SkeletonTable } from '@/components/shared/skeletonTable'

export default function UserDepartment() {

  const [deptData, setDeptData] = React.useState<DepartmentType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openDialog] = React.useState(false);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/users/departments');
      if (!response.ok && response.status !== 403 && response.status !== 404) {
        throw new Error('Failed to fetch departments');
      }

      if (response.status === 403) {
        return toast.error("You don't have permission to access this page");
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
  };

  React.useEffect(() => {
    fetchDepartments();
  }, [])


  return (
    <ContentLayout title="User Department">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Management</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Department</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="container mx-auto py-10 gap-6">
        <div className="flex items-center justify-between">
          <h5 className="text-xl md:text-3xl font-bold">Departments</h5>
          {/* <Link href="/user-management/user-department" className='btn btn-primary'>Add User</Link> */}
          <DrawerDialogDemo isOpen={openDialog} title="New Department" description="Add new department" btnText="New Department">
            <DeptForm />
          </DrawerDialogDemo>
        </div>
        <Separator className="my-5" />
        {loading ? <SkeletonTable /> : <DeptDataTable columns={department_columns} data={deptData} />}
      </div>
    </ContentLayout>
  );
}



