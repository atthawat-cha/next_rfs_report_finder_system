"use client";
import Link from "next/link";
import React from "react";
import { ContentLayout } from "@/components/layouts/content-layout";
import PermissionsFormCheckbox from "@/components/shared/permissions-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PermissionTemplateType } from "@/lib/types";
import toast from "react-hot-toast";


export default function RolesFormManage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [params, setParams] = React.useState({role:{name:"", display_name:""}, permissions: []});
  const [roleTemplate, setRoleTemplate] = React.useState<PermissionTemplateType[]>();

  const handleSubmit = async () => {
    setIsLoading(true);
    if(!params.role.name || !params.role.display_name) {
      toast.error("Please fill in all required fields");
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/users/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        credentials: "include",
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        console.error(await res.text());
        return;
      }

      const data = await res.json();
      if (!data?.success) {
        return;
      }
      toast.success("Role has been created successfully");
      setIsLoading(false);
      setParams({
        role: { name: "", display_name: "" },
        permissions: [],
      });
    } catch (error) {
      toast.error("An error occurred while submitting the form");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissionTemplate = async () => {
    try {
      const res = await fetch("/api/baseconfig/permissions", {
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
      setRoleTemplate(data?.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

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
        <div className="flex items-center justify-between">
          <h5 className="text-xl md:text-3xl font-bold">Roles</h5>
          <Button asChild>
            <Link href="/role-management/roles" className="btn btn-primary">
              Back
            </Link>
          </Button>
        </div>
        <Separator className="my-5" />
        <Card className="w-full p-5">
          <form action="" method="post">
            <CardContent>
              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Role Name"
                    value={params?.role?.name ?? ''}
                    autoComplete="off"
                    onChange={(e) =>
                      setParams({ ...params, role: { ...params.role, name: e.target.value } })
                    }
                    required
                    disabled={isLoading}
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
                    value={params?.role?.display_name ?? ''}
                    autoComplete="off"
                    onChange={(e) =>
                      setParams({ ...params, role: { ...params.role, display_name: e.target.value } })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>

            <CardContent>
              {roleTemplate?.length &&  <PermissionsFormCheckbox params={params} setParams={setParams} template={roleTemplate} />}
            </CardContent>

            <CardFooter>
              <div className="w-full flex item-end justify-between my-2 gap-5">
                <Button
                  type="button"
                  className="w-full"
                  disabled={isLoading}
                  onClick={handleSubmit}>
                  {isLoading ? "กำลังบันทึก..." : "บันทึก"}
                </Button>

                <Button variant='outline' className="w-full" asChild>
                  <Link href="/user-management/user-list" className="hover:text-primary transition-colors">
                    ล้างข้อมูล
                  </Link>
                </Button>

              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ContentLayout>
  );
}
