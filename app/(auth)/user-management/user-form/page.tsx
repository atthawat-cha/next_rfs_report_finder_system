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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import toast from "react-hot-toast";


export default function UserFormData() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/user-management/user-list';

  const [action, setAction] = React.useState("create");
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
  const [baseCongig, setBaseConfig] = React.useState({roles: [], departments: [], status: []});

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

      if (!res.ok) {
        console.error(await res.text());
        return;
      }

      const data = await res.json();
      if (!data?.success) {
        return;
      }
      toast.success("User has been created successfully");
      setLoading(false);
      router.push(redirect);
      router.refresh();
    } catch (error) {
      toast.error("Error creating user");
      setLoading(false);
    }
    
  };

  React.useEffect(() => {
    getConfigData();
  }, [])


  return (
    <ContentLayout title={action == "create" ? "User Create" : "User Update"}>
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
            <BreadcrumbPage>
              {action == "create" ? "User Create" : "User Update"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="container mx-auto py-10 gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl md:text-1xl font-bold">
            {action == "create" ? "User Create" : "User Update"}
          </h3>
          {/* <Link href="/user-management/user-department" className='btn btn-primary'>Add User</Link> */}
          <Button asChild>
            <Link href={"/user-management/user-list"}>Back</Link>
          </Button>
        </div>
        <Separator className="my-5" />

        <Card className="w-full p-5">
          <form onSubmit={handleSubmit}>
            <CardContent className="w-full">
              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="username"
                    placeholder="Username"
                    value={userParams.username}
                    autoComplete="off"
                    onChange={(e) =>
                      setUserParams({ ...userParams, username: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-sm text-muted-foreground pl-2">
                      The username must be unique
                  </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
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
                    <FieldLabel>Role</FieldLabel>
                    <Select value={userParams.role_id} onValueChange={(e) => setUserParams({ ...userParams, role_id: e })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseCongig?.roles?.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Select role area of work.
                    </FieldDescription>
                  </Field>
                </div>

                <div className="w-full space-y-2">
                  <Field className="w-full">
                    <FieldLabel>Department</FieldLabel>
                    <Select value={userParams.department_id} onValueChange={(e) => setUserParams({ ...userParams, department_id: e })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseCongig?.departments?.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Select your department or area of work.
                    </FieldDescription>
                  </Field>
                </div>
              </div>

              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Field className="w-full">
                    <FieldLabel>Status</FieldLabel>
                    <Select value={userParams.status} onValueChange={(e) => setUserParams({ ...userParams, status: e })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseCongig?.status?.map((item: any) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Select your department or area of work.
                    </FieldDescription>
                  </Field>
                </div>
              </div>

              <FieldSeparator className="my-4">Personal Information</FieldSeparator>
              <div className="flex item-center justify-between my-2 gap-5">
                <div className="w-full space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="firstname"
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
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Last Name"
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="email"
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
  );
}
