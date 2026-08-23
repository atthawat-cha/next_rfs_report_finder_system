"use client";

import React, { useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "@/components/shared/fileuploading";
import { ParamTab } from "@/components/reportEditor/paramTab";
import { QueryTab } from "@/components/reportEditor/queryTab";
import { SubTab } from "@/components/reportEditor/subTab";
import { DocTab } from "@/components/reportEditor/docTab";
import { HistoryTab } from "@/components/reportEditor/historyTab";
import { Loader2, FileText, Layers, CheckCircle2 } from "lucide-react";
import { ReportCreateDataType } from "@/lib/types";
import { AccessLevel, ReportOutputType } from "@/app/generated/prisma/enums";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────
type SelectOption = { id: string; name: string };

interface BaseSelect {
  departments: SelectOption[];
  status: string[];
  catagory: SelectOption[];
  access_level: string[];
  output_type: string[];
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReportCreate() {
  const [baseSelect, setBaseSelect] = React.useState<BaseSelect>({
    departments: [],
    status: [],
    catagory: [],
    access_level: [],
    output_type: [],
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // Set once the Info tab's first save succeeds — from then on the page stays
  // put (no navigation) and Param/Query/Sub/Doc/History unlock in place,
  // rendering the same shared tab components report-edit uses (Phase 10
  // revision v2, decision #7: manage everything starting at creation).
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [reportData, setReportData] = React.useState<ReportCreateDataType>({
    code: "",
    name: "",
    description: "",
    category: "",
    department: "",
    status: "DRAFT",
    is_downloadable: true,
    is_editable: true,
    access_level: AccessLevel.PUBLIC,
    output_type: ReportOutputType.DATA_REPORT,
    files: []
  });

  const fetchBaseData = useCallback(async () => {
    const res = await fetch("/api/baseconfig/selections", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    const data = await res.json();
    if (!data?.success) return;

    const { baseDept, basereportStatus, baseCatagory, baseAccessLevel, baseOutputType } = data?.baseConfig;
    setBaseSelect({
      departments: baseDept,
      status: basereportStatus,
      catagory: baseCatagory,
      access_level: baseAccessLevel,
      output_type: baseOutputType,
    });
  }, []);

  React.useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("code", reportData.code);
      formData.append("name", reportData.name);
      formData.append("description", reportData.description);
      formData.append("categories", reportData.category);
      formData.append("departments", reportData.department);
      formData.append("status", reportData.status);
      formData.append("is_downloadable", (reportData.is_downloadable ?? true).toString());
      formData.append("is_editable", (reportData.is_editable ?? true).toString());
      formData.append("access_level", reportData.access_level);
      formData.append("output_type", reportData.output_type);

      if (reportData.files.length === 0) {
        toast.error("Please select at least one file");
        return;
      }
      reportData.files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/reports/report/manage", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        console.error(await res.text());
        throw new Error("Failed response from server");
      }
      const data = await res.json();
      if (!data?.success) throw new Error("Operation unsuccessful");

      toast.success("สร้างรายงานสำเร็จ — จัดการ Param/Query/Sub/Doc/History ต่อได้จากแท็บด้านซ้ายเลย");
      setCreatedId(data.data.id);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to create report", error);
      }
      toast.error("Failed to create report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setReportData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string | boolean | string[]) => {
    setReportData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const locked = !createdId;

  return (
    <ContentLayout title="Report Create">
      <DefaultBreadcrumb />
      <Separator className="my-5" />

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Report Creation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {createdId
            ? "บันทึกข้อมูลพื้นฐานสำเร็จแล้ว — จัดการ Param/Query/Sub/Doc/History ต่อได้เลย"
            : "Fill in the details below and share the report with your organization."}
        </p>
      </div>

      <Tabs defaultValue="info" orientation="vertical" className="group flex items-start gap-6">
        <TabsList className="w-48 flex-none sticky top-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="param" disabled={locked} title={locked ? "บันทึกข้อมูลพื้นฐานก่อน" : undefined}>Param</TabsTrigger>
          <TabsTrigger value="query" disabled={locked} title={locked ? "บันทึกข้อมูลพื้นฐานก่อน" : undefined}>Query</TabsTrigger>
          <TabsTrigger value="sub" disabled={locked} title={locked ? "บันทึกข้อมูลพื้นฐานก่อน" : undefined}>Sub</TabsTrigger>
          <TabsTrigger value="doc" disabled={locked} title={locked ? "บันทึกข้อมูลพื้นฐานก่อน" : undefined}>Doc</TabsTrigger>
          <TabsTrigger value="history" disabled={locked} title={locked ? "บันทึกข้อมูลพื้นฐานก่อน" : undefined}>History</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-0 flex-1 min-w-0">
          {createdId && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4 flex-none" />
              สร้างรายงานสำเร็จแล้ว ข้อมูลพื้นฐานด้านล่างนี้เป็นแบบอ่านอย่างเดียว — แก้ไขเพิ่มเติมได้ที่หน้า{" "}
              <a href={`/reports/report-edit/${createdId}`} className="underline font-medium">แก้ไขรายงาน</a>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            {/* Two-column card grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* ── LEFT: Report Information ─────────────────────────────────── */}
              <Card className="h-[600px] overflow-y-auto">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Report Information</CardTitle>
                  </div>
                  <CardDescription>Basic details about the report.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Code */}
                  <Field>
                    <FieldLabel htmlFor="code">
                      Code <span className="text-destructive ml-0.5">*</span>
                    </FieldLabel>
                    <Input
                      id="code"
                      name="code"
                      placeholder="e.g. Anes-0001"
                      required
                      autoComplete="off"
                      disabled={!!createdId}
                      value={reportData?.code}
                      onChange={handleInputChange}
                    />
                    <FieldDescription>Format: Department-XXXX</FieldDescription>
                  </Field>

                  {/* Name */}
                  <Field>
                    <FieldLabel htmlFor="name">
                      Name <span className="text-destructive ml-0.5">*</span>
                    </FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter report name"
                      required
                      autoComplete="off"
                      disabled={!!createdId}
                      value={reportData?.name}
                      onChange={handleInputChange}
                    />
                  </Field>

                  {/* Category + Department – inline 2-col */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="rp_catagory">Category</FieldLabel>
                      <Select disabled={!!createdId} value={reportData?.category} onValueChange={(e) => handleSelectChange("category", e)}>
                        <SelectTrigger id="rp_catagory">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {baseSelect.catagory.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="rp_department">Department</FieldLabel>
                      <Select disabled={!!createdId} value={reportData?.department} onValueChange={(e) => handleSelectChange("department", e)}>
                        <SelectTrigger id="rp_department">
                          <SelectValue placeholder="Select dept." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {baseSelect.departments.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Status */}
                  <Field>
                    <FieldLabel htmlFor="rp_status">Status</FieldLabel>
                    <Select disabled={!!createdId} value={reportData?.status} onValueChange={(e) => handleSelectChange("status", e)}>
                      <SelectTrigger id="rp_status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseSelect.status.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Access Level */}
                  <Field>
                    <FieldLabel htmlFor="rp_access_level">Access Level</FieldLabel>
                    <Select disabled={!!createdId} value={reportData?.access_level} onValueChange={(e) => handleSelectChange("access_level", e)}>
                      <SelectTrigger id="rp_access_level">
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseSelect.access_level.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      PUBLIC เผยแพร่ให้ผู้ใช้ทั่วไปเห็นได้ · RESTRICTED/PRIVATE ต้องกำหนดสิทธิ์รายบุคคล/บทบาทเพิ่มในหน้าแก้ไขรายงาน ไม่งั้นจะไม่มีใครเห็นเลยนอกจากแอดมิน
                    </FieldDescription>
                  </Field>

                  {/* Output Type */}
                  <Field>
                    <FieldLabel htmlFor="rp_output_type">Output Type</FieldLabel>
                    <Select disabled={!!createdId} value={reportData?.output_type} onValueChange={(e) => handleSelectChange("output_type", e)}>
                      <SelectTrigger id="rp_output_type">
                        <SelectValue placeholder="Select output type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseSelect.output_type.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      PRINT_FORM = ใบพิมพ์ (PDF) · DATA_REPORT = รายงานข้อมูล (Excel) — กำหนดครั้งเดียวตอนสร้าง เปลี่ยนไม่ได้หลังแนบไฟล์แล้ว
                    </FieldDescription>
                  </Field>

                </CardContent>
              </Card>

              {/* ── RIGHT: Report Settings ───────────────────────────────────── */}
              <Card className="h-[600px] overflow-y-auto">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Report Settings</CardTitle>
                  </div>
                  <CardDescription>Configure type, notes, and attachments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Report options */}
                  <FieldDescription>Report Options</FieldDescription>
                  <Field orientation="horizontal">
                    <Checkbox id="is_downloadable" disabled={!!createdId} checked={reportData?.is_downloadable} onCheckedChange={(e) => handleSelectChange("is_downloadable", e)} />
                    <FieldLabel
                      htmlFor="is_downloadable"
                      className="font-normal">
                      Downloadable
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id="is_editable" disabled={!!createdId} checked={reportData?.is_editable} onCheckedChange={(e) => handleSelectChange("is_editable", e)} />
                    <FieldLabel
                      htmlFor="is_editable"
                      className="font-normal"
                    >
                      Editable
                    </FieldLabel>
                  </Field>

                  {/* File Upload */}
                  <FileUpload
                    label="Attachments"
                    accept="all"
                    multiple
                    maxSizeMB={20}
                    disabled={!!createdId}
                    onFilesChange={(files) => setReportData(prev => ({ ...prev, files }))}
                    fileOutside={reportData?.files}
                  />

                  {/* Description */}
                  <Field>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Add any additional information about this report…"
                      className="resize-none min-h-[96px]"
                      disabled={!!createdId}
                      value={reportData?.description}
                      onChange={handleInputChange}
                    />
                  </Field>

                </CardContent>
              </Card>
            </div>

            {/* ── Action bar ───────────────────────────────────────────────────── */}
            {!createdId && (
              <div className="mt-6 flex items-center justify-end gap-3">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Create Report"
                  )}
                </Button>
              </div>
            )}
          </form>
        </TabsContent>

        <TabsContent value="param" className="mt-0 flex-1 min-w-0">
          {createdId && <ParamTab reportId={createdId} />}
        </TabsContent>

        <TabsContent value="query" className="mt-0 flex-1 min-w-0">
          {createdId && <QueryTab reportId={createdId} />}
        </TabsContent>

        <TabsContent value="sub" className="mt-0 flex-1 min-w-0">
          {createdId && <SubTab reportId={createdId} />}
        </TabsContent>

        <TabsContent value="doc" className="mt-0 flex-1 min-w-0">
          {createdId && <DocTab reportId={createdId} />}
        </TabsContent>

        <TabsContent value="history" className="mt-0 flex-1 min-w-0">
          {createdId && <HistoryTab reportId={createdId} />}
        </TabsContent>
      </Tabs>
    </ContentLayout>
  );
}
