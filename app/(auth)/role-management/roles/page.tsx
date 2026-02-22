import { ContentLayout } from '@/components/layouts/content-layout'
import { SharedDataTable } from '@/components/shared/dataTable'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import React from 'react'
import { roles_columns } from './roles-columns'

export default function RolesManagement() {
  return (
    <ContentLayout title="Role Management">
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
            New Role
          </Button>
        </div>
        <Separator className='my-5'/>
        <SharedDataTable columns={roles_columns} data={[]} />
      </div>

    </ContentLayout>
  )
}
