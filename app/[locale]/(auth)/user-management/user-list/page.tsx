'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Link } from '@/i18n/navigation'
import React from 'react';
import { UsersDataTable } from './users-data-table';
import { getUsersColumns } from './columns';
import { UserTableType } from '@/lib/types';
import { Separator } from "@/components/ui/separator"
import { Button } from '@/components/ui/button';
import { SkeletonTable } from '@/components/shared/skeletonTable';
import { useTranslations } from 'next-intl';




export default function UserLists() {
  const t = useTranslations('userManagement.userList');
  const tc = useTranslations('common');
  const tCol = useTranslations('userManagement.userList.columns');
  const columns = React.useMemo(() => getUsersColumns(tCol), [tCol]);

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
    <ContentLayout title={t('pageTitle')}>
        <Breadcrumb>
            <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbLink asChild>
                <Link href="/">{tc('breadcrumbDashboard')}</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbLink asChild>
                <Link href="/dashboard">{t('breadcrumbUsersManagement')}</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbPage>{t('listTitle')}</BreadcrumbPage>
            </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>

      <div className="container mx-auto py-10 gap-6">
        <div className='flex items-center justify-between'>
          <h3 className="text-3xl md:text-4xl font-bold">{t('listTitle')}</h3>
          <Button asChild>
            <Link href={'/user-management/user-form'}>
              {t('newUser')}
            </Link>
          </Button>
        </div>
        <Separator className='my-5'/>
        {loading ? <SkeletonTable /> : <UsersDataTable columns={columns} data={users} />}
      </div>
    </ContentLayout>
  )
}
