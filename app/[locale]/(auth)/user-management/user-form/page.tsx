"use client";
import { ContentLayout } from "@/components/layouts/content-layout";
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
import { Field, FieldDescription, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UserCreateType } from "@/lib/types";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import React from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

interface SelectOption {
  id: string;
  name: string;
}

interface UserFormBaseConfig {
  roles: SelectOption[];
  departments: SelectOption[];
  status: string[];
}

export default function UserFormData() {
  const t = useTranslations("userManagement.userForm");
  const tc = useTranslations("common");

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/user-management/user-list';

  const [action] = React.useState("create");
  const [userParams, setUserParams] = React.useState<UserCreateType>({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    role_id: "",
    department_id: "",
    status: "",
  });
  const [isLoading, setLoading] = React.useState(false);
  const [baseCongig, setBaseConfig] = React.useState<UserFormBaseConfig>({roles: [], departments: [], status: []});

  // Base Config
const getConfigData = async () => {
    try {
      const res = await fetch("/api/baseconfig/selections", {
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
      console.log(data?.baseConfig);
      const { baseRole, baseDept,baseStatus } = data?.baseConfig;
      
      setBaseConfig({roles: baseRole, departments: baseDept, status: baseStatus});
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }


  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        credentials: "include",
        body: JSON.stringify(userParams),
      })

      const data = await res.json();
      if (!res.ok || !data?.success) {
        console.error(data);
        toast.error(t("createError"));
        return;
      }

      toast.success(t("createSuccess"));
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error(t("createError"));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    getConfigData();
  }, [])


  return (
    <ContentLayout title={action == "create" ? t("createTitle") : t("updateTitle")}>
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
              <Link href="/dashboard">{t("breadcrumbUsersManagement")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {action == "create" ? t("createTitle") : t("updateTitle")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="container mx-auto py-10 gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl md:text-1xl font-bold">
            {action == "create" ? t("createTitle") : t("updateTitle")}
          </h3>
          <Button asChild>
            <Link href={"/user-management/user-list"}>{t("back")}</Link>
          </Button>
        </div>
        <Separator className="my-5" />

        <Card className="w-full p-5">
          <form onSubmit={handleSubmit}>
            <CardContent className="w-full">
              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Label htmlFor="username">{t("usernameLabel")}</Label>
                  <Input
                    id="username"
                    type="username"
                    placeholder={t("usernamePlaceholder")}
                    value={userParams.username}
                    autoComplete="off"
                    onChange={(e) =>
                      setUserParams({ ...userParams, username: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-sm text-muted-foreground pl-2">
                      {t("usernameHint")}
                  </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                  <Label htmlFor="password">{t("passwordLabel")}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("passwordPlaceholder")}
                    value={userParams.password}
                    autoComplete="off"
                    onChange={(e) =>
                      setUserParams({ ...userParams, password: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Field className="w-full">
                    <FieldLabel>{t("roleLabel")}</FieldLabel>
                    <Select value={userParams.role_id} onValueChange={(e) => setUserParams({ ...userParams, role_id: e })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("rolePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseCongig?.roles?.map((item: SelectOption) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t("roleHint")}
                    </FieldDescription>
                  </Field>
                </div>

                <div className="w-full space-y-2">
                  <Field className="w-full">
                    <FieldLabel>{t("departmentLabel")}</FieldLabel>
                    <Select value={userParams.department_id} onValueChange={(e) => setUserParams({ ...userParams, department_id: e })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("departmentPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseCongig?.departments?.map((item: SelectOption) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t("departmentHint")}
                    </FieldDescription>
                  </Field>
                </div>
              </div>

              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Field className="w-full">
                    <FieldLabel>{t("statusLabel")}</FieldLabel>
                    <Select value={userParams.status} onValueChange={(e) => setUserParams({ ...userParams, status: e })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("statusPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseCongig?.status?.map((item: string) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t("statusHint")}
                    </FieldDescription>
                  </Field>
                </div>
              </div>

              <FieldSeparator className="my-4">{t("personalInfo")}</FieldSeparator>
              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Label htmlFor="first_name">{t("firstNameLabel")}</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder={t("firstNamePlaceholder")}
                    value={userParams.first_name}
                    autoComplete="off"
                    onChange={(e) =>
                      setUserParams({
                        ...userParams,
                        first_name: e.target.value,
                      })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="w-full space-y-2">
                  <Label htmlFor="last_name">{t("lastNameLabel")}</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder={t("lastNamePlaceholder")}
                    value={userParams.last_name}
                    autoComplete="off"
                    onChange={(e) =>
                      setUserParams({
                        ...userParams,
                        last_name: e.target.value,
                      })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Label htmlFor="email">{t("emailLabel")}</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder={t("emailPlaceholder")}
                    value={userParams?.email || ''}
                    autoComplete="off"
                    onChange={(e) =>
                      setUserParams({
                        ...userParams,
                        email: e.target.value,
                      })
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>

            </CardContent>
            <CardFooter className="flex w-full gap-4 items-center justify-end">
              <div className="flex item-center justify-end my-2 gap-5">
                <Button type="button" className="w-full" disabled={isLoading} onClick={handleSubmit}>
                  {isLoading ? tc("saving") : tc("save")}
                </Button>

                <div className="text-sm text-center text-muted-foreground">
                  <Button asChild>
                    <Link
                      href="/user-management/user-list"
                      className="hover:text-primary transition-colors"
                    >
                      {t("reset")}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ContentLayout>
  );
}
