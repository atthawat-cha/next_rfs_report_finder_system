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
import { DrawerWithSides } from '@/components/shared/right-drawer'

// Drawer
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"


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
        <div className="flex items-center justify-between">
          <h5 className="text-xl md:text-3xl font-bold">Departments</h5>
          {/* <Link href="/user-management/user-department" className='btn btn-primary'>Add User</Link> */}
          <Button>New Department</Button>

          
        </div>
        <Separator className="my-5" />
        <DeptDataTable columns={department_columns} data={deptData} />
      </div>

      <Drawer direction="right">
            <DrawerTrigger asChild>
              <Button variant="outline">Scrollable Content</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Move Goal</DrawerTitle>
                <DrawerDescription>
                  Set your daily activity goal.
                </DrawerDescription>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <p
                    key={index}
                    className="mb-4 leading-normal style-lyra:mb-2 style-lyra:leading-relaxed"
                  >
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                    ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
                    occaecat cupidatat non proident, sunt in culpa qui officia
                    deserunt mollit anim id est laborum.
                  </p>
                ))}
              </div>
              <DrawerFooter>
                <Button>Submit</Button>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
    </ContentLayout>
  );
}
