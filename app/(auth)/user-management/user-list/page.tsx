'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { User } from '@/lib/auth';
import Link from 'next/link'
import React from 'react';

interface UsersTablbe {
  id: string;
  username: string;
  first_name: string;
}

export default function UserLists() {

  // State
  const [users, setUsers] = React.useState<UsersTablbe[]>([]);


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
      console.log(data);
      setUsers(data?.data);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      {users?.map((user) => (
        <div key={user?.id}>
          <h2>{user?.username}</h2>
        </div>
      ))}
    </ContentLayout>
  )
}
