'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { SharedDataTable } from '@/components/shared/dataTable'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import React from 'react'
import { roles_columns } from './roles-columns'
import { SkeletonTable } from '@/components/shared/skeletonTable'

export default function RolesManagement() {

  const [rolesData, setRolesData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/users/roles');
      if (res.ok) {        
        const data = await res.json();
        console.log('Fetched roles:', data);
        setRolesData(data);
      }else {
        console.error('Failed to fetch roles:', res.statusText);
      }

    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchRoles();
  }, []);


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
                <BreadcrumbPage>Roles</BreadcrumbPage>
            </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
        <div className="container mx-auto py-10 gap-6">
        <div className='flex items-center justify-between'>
          <h5 className="text-xl md:text-3xl font-bold">Roles</h5>
          {/* <Link href="/user-management/user-department" className='btn btn-primary'>Add User</Link> */}
          <Button asChild>
            <Link href="/role-management/role-form" className='btn btn-primary'>New Role</Link>
          </Button>
        </div>
        <Separator className='my-5'/>
          {loading ? ( <SkeletonTable/>) : 
        <SharedDataTable columns={roles_columns} data={rolesData} />}
      </div>

    </ContentLayout>
  )
}
