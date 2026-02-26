'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import React from 'react'

export default function RolesFormManage() {

  const [isLoading, setIsLoading] = React.useState(false);
  const [roleData, setRoleData] = React.useState({});
  const [roleTemplate, setRoleTemplate] = React.useState({});

  const handleSubmit = async () => {
    console.log(roleData);
  }

  const fetchPermissionTemplate = async () => {
    try {
      const res = await fetch('/api/baseconfig/permissions',{
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
      setRoleTemplate(data?.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  React.useEffect(() => {
    fetchPermissionTemplate();
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
            <Link href="/role-management/roles" className='btn btn-primary'>Back</Link>
          </Button>
        </div>
        <Separator className='my-5'/>
        <Card className='w-full p-5'>
          <form action="" method="post">
          <CardContent>
            <div className="flex item-center justify-between my-2 gap-5">
              <div className="w-full space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Role Name"
                  value={''}
                  autoComplete="off"
                  // onChange={(e) =>
                  //   setUserParams({ ...userParams, username: e.target.value })
                  // }
                  required
                  // disabled={isLoading}
                />
                <FieldDescription className="text-sm text-muted-foreground pl-2">
                    Enter you're role name to above.
                </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="display_name"
                  type="text"
                  placeholder="Display Name"
                  value={''}
                  autoComplete="off"
                  // onChange={(e) =>
                  //   setUserParams({ ...userParams, username: e.target.value })
                  // }
                  required
                  // disabled={isLoading}
                />
                </div>
              </div>
          </CardContent>
          
          <CardFooter>
              <div className="flex item-center justify-between my-2 gap-5">
                <Button type="button" className="w-full" disabled={isLoading} onClick={handleSubmit}>
                  {isLoading ? "กำลังบันทึก..." : "บันทึก"}
                </Button>

                <div className="text-sm text-center text-muted-foreground">
                  <Button asChild>
                    <Link
                      href="/user-management/user-list"
                      className="hover:text-primary transition-colors"
                    >
                      Reset
                    </Link>
                  </Button>
                </div>
              </div>
          </CardFooter>
          </form>
        </Card>
      </div>
    </ContentLayout>
  )
}
