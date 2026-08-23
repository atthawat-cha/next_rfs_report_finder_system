"use client";

import React, { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContentLayout } from "@/components/layouts/content-layout";
import DefaultBreadcrumb from "@/components/shared/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ReportPermissionsDrawer } from "@/components/shared/reportPermissionsDrawer";
import { ParamTab } from "@/components/reportEditor/paramTab";
import { QueryTab } from "@/components/reportEditor/queryTab";
import { SubTab } from "@/components/reportEditor/subTab";
import { DocTab } from "@/components/reportEditor/docTab";
import { HistoryTab } from "@/components/reportEditor/historyTab";
import { Loader2, FileText, Layers, Shield } from "lucide-react";
import toast from "react-hot-toast";

type SelectOption = { id: string; name: string };

interface BaseSelect {
  departments: SelectOption[];
  status: string[];
  catagory: SelectOption[];
  access_level: string[];
}

interface EditFormState {
  code: string;
  name_th: string;
  description: string;
  category_id: string;
  department_id: string;
  status: string;
  access_level: string;
  is_downloadable: boolean;
  is_editable: boolean;
}

export default function ReportEdit() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reportId = params.id;

  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [outputType, setOutputType] = React.useState<string>("DATA_REPORT");
  const [permissionsOpen, setPermissionsOpen] = React.useState(false);
  const [baseSelect, setBaseSelect] = React.useState<BaseSelect>({
    departments: [],
    status: [],
    catagory: [],
    access_level: [],
  });
  const [formData, setFormData] = React.useState<EditFormState>({
    code: "",
    name_th: "",
    description: "",
    category_id: "",
    department_id: "",
    status: "DRAFT",
    access_level: "PUBLIC",
    is_downloadable: true,
    is_editable: true,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, baseRes] = await Promise.all([
        fetch(`/api/reports/report/manage/${reportId}`, { credentials: "include" }),
        fetch("/api/baseconfig/selections", { credentials: "include" }),
      ]);

      if (!reportRes.ok) {
        toast.error("Failed to load report");
        return;
      }
      const reportJson = await reportRes.json();
      if (!reportJson?.success) {
        toast.error("Report not found");
        return;
      }
      const report = reportJson.data;
      setFormData({
        code: report.code,
        name_th: report.name_th,
        description: report.description ?? "",
        category_id: report.category_id,
        department_id: report.department_id ?? "",
        status: report.status,
        access_level: report.access_level,
        is_downloadable: report.is_downloadable,
        is_editable: report.is_editable,
      });
      setOutputType(report.output_type);

      if (baseRes.ok) {
        const baseJson = await baseRes.json();
        if (baseJson?.success) {
          const { baseDept, basereportStatus, baseCatagory, baseAccessLevel } = baseJson.baseConfig;
          setBaseSelect({
            departments: baseDept,
            status: basereportStatus,
            catagory: baseCatagory,
            access_level: baseAccessLevel,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reports/report/manage/${reportId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        toast.error("Failed to save report");
        return;
      }
      toast.success("Report updated");
      router.push("/reports/report-list");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save report");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ContentLayout title="Report Edit">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Report Edit">
      <DefaultBreadcrumb />
      <Separator className="my-5" />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Edit Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Output type: <span className="font-medium">{outputType}</span> (กำหนดตอนสร้าง แก้ไม่ได้)
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setPermissionsOpen(true)}>
          <Shield className="h-4 w-4 mr-2" /> จัดการสิทธิ์
        </Button>
      </div>

      <ReportPermissionsDrawer
        reportId={reportId}
        open={permissionsOpen}
        onOpenChange={setPermissionsOpen}
      />

      <Tabs defaultValue="info" orientation="vertical" className="group flex items-start gap-6">
        <TabsList className="w-48 flex-none sticky top-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="param">Param</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
          <TabsTrigger value="sub">Sub</TabsTrigger>
          <TabsTrigger value="doc">Doc</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ══════════════════ INFO ══════════════════ */}
        <TabsContent value="info" className="mt-0 flex-1 min-w-0">
          <form onSubmit={handleSaveMetadata} noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Report Information</CardTitle>
                  </div>
                  <CardDescription>Basic details about the report.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="code">Code</FieldLabel>
                    <Input id="code" value={formData.code} onChange={handleInputChange} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="name_th">Name</FieldLabel>
                    <Input id="name_th" value={formData.name_th} onChange={handleInputChange} />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="rp_catagory">Category</FieldLabel>
                      <Select value={formData.category_id} onValueChange={(v) => handleSelectChange("category_id", v)}>
                        <SelectTrigger id="rp_catagory">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {baseSelect.catagory.map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="rp_department">Department</FieldLabel>
                      <Select value={formData.department_id} onValueChange={(v) => handleSelectChange("department_id", v)}>
                        <SelectTrigger id="rp_department">
                          <SelectValue placeholder="Select dept." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {baseSelect.departments.map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="rp_status">Status</FieldLabel>
                    <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}>
                      <SelectTrigger id="rp_status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseSelect.status.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="rp_access_level">Access Level</FieldLabel>
                    <Select value={formData.access_level} onValueChange={(v) => handleSelectChange("access_level", v)}>
                      <SelectTrigger id="rp_access_level">
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseSelect.access_level.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      className="resize-none min-h-[96px]"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </Field>

                  <Field orientation="horizontal">
                    <Checkbox
                      id="is_downloadable"
                      checked={formData.is_downloadable}
                      onCheckedChange={(v) => handleSelectChange("is_downloadable", v === true)}
                    />
                    <FieldLabel htmlFor="is_downloadable" className="font-normal">Downloadable</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="is_editable"
                      checked={formData.is_editable}
                      onCheckedChange={(v) => handleSelectChange("is_editable", v === true)}
                    />
                    <FieldLabel htmlFor="is_editable" className="font-normal">Editable</FieldLabel>
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Report Settings</CardTitle>
                  </div>
                  <CardDescription>
                    Output type: <span className="font-medium">{outputType}</span> (กำหนดตอนสร้าง แก้ไม่ได้)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldDescription>
                    ไฟล์ คิวรี่ พารามิเตอร์ รายงานย่อย และการแชร์ ย้ายไปจัดการในแท็บ Param / Query / Sub / Doc แล้ว
                  </FieldDescription>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => router.push("/reports/report-list")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="param" className="mt-0 flex-1 min-w-0">
          <ParamTab reportId={reportId} />
        </TabsContent>

        <TabsContent value="query" className="mt-0 flex-1 min-w-0">
          <QueryTab reportId={reportId} />
        </TabsContent>

        <TabsContent value="sub" className="mt-0 flex-1 min-w-0">
          <SubTab reportId={reportId} />
        </TabsContent>

        <TabsContent value="doc" className="mt-0 flex-1 min-w-0">
          <DocTab reportId={reportId} />
        </TabsContent>

        <TabsContent value="history" className="mt-0 flex-1 min-w-0">
          <HistoryTab reportId={reportId} />
        </TabsContent>
      </Tabs>
    </ContentLayout>
  );
}
