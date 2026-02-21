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


export default function UserDepartment() {

  const [deptData, setDeptData] = React.useState<DepartmentType[]>([]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/users/departments');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      setDeptData(data);
      console.log(data);
    } catch (error) {
      console.log('Error fetching departments:', error);
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
        <div className='flex items-center justify-between'>
          <h5 className="text-xl md:text-3xl font-bold">Departments</h5>
          {/* <Link href="/user-management/user-department" className='btn btn-primary'>Add User</Link> */}
          <Button>
            New Department
          </Button>
        </div>
        <Separator className='my-5'/>
        <DeptDataTable columns={department_columns} data={deptData} />
      </div>
    </ContentLayout>
  )
}
