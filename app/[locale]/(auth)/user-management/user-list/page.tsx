'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Link } from '@/i18n/navigation'
import React from 'react';
import { UsersDataTable } from './users-data-table';
import { users_columns } from './columns';
import { UserTableType } from '@/lib/types';
import { Separator } from "@/components/ui/separator"
import { Button } from '@/components/ui/button';
import { SkeletonTable } from '@/components/shared/skeletonTable';



export default function UserLists() {

  // State
  const [users, setUsers] = React.useState<UserTableType[]>([]);
  const [loading, setLoading] = React.useState(true);


  // Functions
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users/user", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        credentials: "include",
      });

      if (!res.ok) {
        console.error(await res.text());
        return;
      }

      const data = await res.json();
      if (!data?.success) {
        return;
      }
      setUsers(data?.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchUsers();
  }, []);


  return (
    <ContentLayout title="User Lists">
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
                <Link href="/dashboard">Users Management</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbPage>User Lists</BreadcrumbPage>
            </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>

      <div className="container mx-auto py-10 gap-6">
        <div className='flex items-center justify-between'>
          <h3 className="text-3xl md:text-4xl font-bold">User Lists</h3>
          {/* <Link href="/user-management/user-department" className='btn btn-primary'>Add User</Link> */}
          <Button asChild>
            <Link href={'/user-management/user-form'}>
              New User
            </Link>
          </Button>
        </div>
        <Separator className='my-5'/>
        {loading ? <SkeletonTable /> : <UsersDataTable columns={users_columns} data={users} />}
      </div>
    </ContentLayout>
  )
}
