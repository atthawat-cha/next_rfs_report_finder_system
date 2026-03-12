'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import React from 'react'

//  Data Table
import { DeptDataTable } from './dept-data-table'
import { DepartmentType } from '@/lib/types' 
import { department_columns } from './dep-columns'
import { DrawerDialogDemo } from '@/components/shared/dialog-drawer'
import toast from 'react-hot-toast'

export default function UserDepartment() {

  const [deptData, setDeptData] = React.useState<DepartmentType[]>([]);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [deptParams, setDeptParams] = React.useState({});

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/users/departments');
      if (!response.ok && response.status !== 403) {
        throw new Error('Failed to fetch departments');
      }

      if (response.status === 403) {
        return toast.error("You don't have permission to access this page");
      }
      
      const data = await response.json();
      setDeptData(data);
      
    } catch (error) {
      console.log('Error fetching departments:', error);
    }
  };


  const handlerSubmit = async () => {
    console.log("SUBMITED");
  }

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
          <DrawerDialogDemo isOpen={openDialog} handlerSubmit={handlerSubmit} title="New Department" description="Add new department" btnText="New Department">
          {'/* Content */'}
          </DrawerDialogDemo>
        </div>
        <Separator className="my-5" />
        <DeptDataTable columns={department_columns} data={deptData} />
      </div>
    </ContentLayout>
  );
}



