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
import { Field, FieldDescription, FieldLabel, FieldSeparator } from "@/components/ui/field";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import FileUpload from "@/components/shared/fileuploading";
import { Loader2, FileText, Layers } from "lucide-react";
import { ReportCreateDataType, ReportGetDataType } from "@/lib/types";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────
type SelectOption = { id: string; name: string };

interface BaseSelect {
  departments: SelectOption[];
  status: string[];
  catagory: SelectOption[];
  access_level: SelectOption[];
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReportCreate() {
  const [baseSelect, setBaseSelect] = React.useState<BaseSelect>({
    departments: [],
    status: [],
    catagory: [],
    access_level: [],
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportCreateDataType>({
    code: "",
    name: "",
    description: "",
    category: "",
    department: "",
    status: "DRAFT",
    is_downloadable: true,
    is_editable: true,
    access_level: [],
    files: []
  });
  const anchor = useComboboxAnchor()

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

    const { baseDept, basereportStatus, baseCatagory, baseRole } = data?.baseConfig;
    setBaseSelect({
      departments: baseDept,
      status: basereportStatus,
      catagory: baseCatagory,
      access_level: convertObjectToArrayValue(baseRole),
    });
  }, []);

  React.useEffect(() => {
    fetchBaseData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // TODO: implement submit logic
      const formData = new FormData();
      formData.append("code", reportData.code);
      formData.append("name", reportData.name);
      formData.append("description", reportData.description);
      formData.append("category", reportData.category);
      formData.append("department", reportData.department);
      formData.append("status", reportData.status);
      formData.append("is_downloadable", reportData.is_downloadable.toString());
      formData.append("is_editable", reportData.is_editable.toString());
      formData.append("access_level", JSON.stringify(reportData.access_level));

      // Fix: iterate through the array of files and append each individually
      if (reportData.files && reportData.files.length > 0) {
        reportData.files.forEach((file) => {
          formData.append("files", file);
        });
      }

      if (reportData.access_level.length === 0 || reportData.files.length === 0) {
        toast.error("Please select at least one access level and one file");
        return;
      }

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

      toast.success("Report created successfully");
      setReportData({
        code: "",
        name: "",
        description: "",
        category: "",
        department: "",
        status: "DRAFT",
        is_downloadable: true,
        is_editable: true,
        access_level: [],
        files: []
      });
      await new Promise((r) => setTimeout(r, 1000));
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

  const convertObjectToArrayValue = (data: any[]) => {
    return data.map((item) => item.name);
  };


  return (
    <ContentLayout title="Report Create">
      <DefaultBreadcrumb />
      <Separator className="my-5" />

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Report Creation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details below and share the report with your organization.
        </p>
      </div>

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
                  value={reportData?.name}
                  onChange={handleInputChange}
                />
              </Field>

              {/* Category + Department – inline 2-col */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="rp_catagory">Category</FieldLabel>
                  <Select value={reportData?.category} onValueChange={(e) => handleSelectChange("category", e)}>
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
                  <Select value={reportData?.department} onValueChange={(e) => handleSelectChange("department", e)}>
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
                <Select value={reportData?.status} onValueChange={(e) => handleSelectChange("status", e)}>
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
                <FieldLabel htmlFor="rp_access_level">Access Roles</FieldLabel>
                <Combobox
                  multiple
                  autoHighlight
                  items={baseSelect?.access_level ?? []}
                  onValueChange={(value) => handleSelectChange("access_level", value)}
                  value={reportData?.access_level}
                >
                  <ComboboxChips ref={anchor} className="w-full">
                    <ComboboxValue>
                      {(values) => (
                        <React.Fragment>
                          {values.map((value: string) => (
                            <ComboboxChip key={`${value}-${Math.random()}`}>{value}</ComboboxChip>
                          ))}
                          <ComboboxChipsInput />
                        </React.Fragment>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxContent anchor={anchor}>
                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={`${item}-${Math.random()}`} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
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

              {/* Report Type – Radio cards */}
              {/* <Field>
                <FieldLabel>Report Type</FieldLabel>
                <RadioGroup
                  defaultValue="crystal"
                  className="grid grid-cols-2 gap-3 pt-1"
                >
                  {(["crystal", "jasper"] as const).map((type) => (
                    <label
                      key={type}
                      htmlFor={`type-${type}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={type} id={`type-${type}`} />
                      <span className="text-sm font-medium capitalize">{type}</span>
                    </label>
                  ))}
                </RadioGroup>
              </Field> */}

              {/* Report options */}
              <FieldDescription>Report Options</FieldDescription>
              <Field orientation="horizontal">
                <Checkbox id="is_downloadable" checked={reportData?.is_downloadable} onCheckedChange={(e) => handleSelectChange("is_downloadable", e)} />
                <FieldLabel
                  htmlFor="is_downloadable"
                  className="font-normal">
                  Downloadable
                </FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="is_editable" checked={reportData?.is_editable} onCheckedChange={(e) => handleSelectChange("is_editable", e)} />
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
                  value={reportData?.description}
                  onChange={handleInputChange}
                />
              </Field>

            </CardContent>
          </Card>
        </div>

        {/* ── Action bar ───────────────────────────────────────────────────── */}
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
      </form>
    </ContentLayout>
  );
}
