"use client";
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
import { PermissionTemplateType, RolePermissionsType } from "@/lib/types";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";


export default function RolesFormManage() {
  const t = useTranslations("roleManagement.roleForm");
  const tc = useTranslations("common");
  const [isLoading, setIsLoading] = React.useState(false);
  const [params, setParams] = React.useState<RolePermissionsType>({role:{name:"", display_name:""}, permissions: []});
  const [roleTemplate, setRoleTemplate] = React.useState<PermissionTemplateType[]>();

  const redirect = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);
    if(!params.role.name || !params.role.display_name) {
      toast.error(t("missingFields"));
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
      toast.success(t("createSuccess"));
      setIsLoading(false);
      setParams({
        role: { name: "", display_name: "" },
        permissions: [],
      });
      redirect.push("/role-management/roles");
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(t("createError"));
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
    <ContentLayout title={t("pageTitle")}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">{tc("breadcrumbDashboard")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">{t("breadcrumbManagement")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("breadcrumbRoles")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="container mx-auto py-10 gap-6">
        <div className="flex items-center justify-between">
          <h5 className="text-xl md:text-3xl font-bold">{t("heading")}</h5>
          <Button asChild>
            <Link href="/role-management/roles" className="btn btn-primary">
              {t("back")}
            </Link>
          </Button>
        </div>
        <Separator className="my-5" />
        <Card className="w-full p-5">
          <form action="" method="post">
            <CardContent>
              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Label htmlFor="name">{t("roleNameLabel")}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("roleNamePlaceholder")}
                    value={params?.role?.name ?? ''}
                    autoComplete="off"
                    onChange={(e) =>
                      setParams({ ...params, role: { ...params.role, name: e.target.value } })
                    }
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-sm text-muted-foreground pl-2">
                    {t("roleNameHint")}
                  </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                  <Label htmlFor="name">{t("displayNameLabel")}</Label>
                  <Input
                    id="display_name"
                    type="text"
                    placeholder={t("displayNamePlaceholder")}
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
                  {isLoading ? tc("saving") : tc("save")}
                </Button>

                <Button variant='outline' className="w-full" asChild>
                  <Link href="/user-management/user-list" className="hover:text-primary transition-colors">
                    {t("reset")}
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
