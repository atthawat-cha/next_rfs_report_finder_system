'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { SharedDataTable } from '@/components/shared/dataTable'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Link } from '@/i18n/navigation'
import React from 'react'
import { getRolesColumns } from './roles-columns'
import { SkeletonTable } from '@/components/shared/skeletonTable'
import { useTranslations } from 'next-intl'

export default function RolesManagement() {
  const t = useTranslations('roleManagement.roles')
  const tCol = useTranslations('roleManagement.roles.columns')
  const tc = useTranslations('common')
  const columns = React.useMemo(() => getRolesColumns(tCol), [tCol])

  const [rolesData, setRolesData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/users/roles');
      if (res.ok) {        
        const data = await res.json();
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
                <Link href="/dashboard">{t('breadcrumbManagement')}</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbPage>{t('breadcrumbRoles')}</BreadcrumbPage>
            </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
        <div className="container mx-auto py-10 gap-6">
        <div className='flex items-center justify-between'>
          <h5 className="text-xl md:text-3xl font-bold">{t('heading')}</h5>
          <Button asChild>
            <Link href="/role-management/role-form" className='btn btn-primary'>{t('newRole')}</Link>
          </Button>
        </div>
        <Separator className='my-5'/>
          {loading ? ( <SkeletonTable/>) :
        <SharedDataTable columns={columns} data={rolesData} />}
      </div>

    </ContentLayout>
  )
}
