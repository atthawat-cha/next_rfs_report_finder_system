"use client";

import React from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import FileUpload from "@/components/shared/fileuploading";
import { Loader2, FileText, Layers } from "lucide-react";
import { ReportGetDataType } from "@/lib/types";
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

// ─── Types ───────────────────────────────────────────────────────────────────
type SelectOption = { id: string; name: string };

interface BaseSelect {
  departments: SelectOption[];
  status: string[];
  catagory: SelectOption[];
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReportCreate() {
  const [baseSelect, setBaseSelect] = React.useState<BaseSelect>({
    departments: [],
    status: [],
    catagory: [],
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportGetDataType>({
    code: "",
    name: "",
    description: "",
    file_path: "",
    file_name: "",
    category: "",
    department: "",
    created_by_id: "",
    status: "DRAFT",
    version: "",
    is_downloadable: true,
    is_editable: true,
    published_at: "",
    created_at: "",
    updated_at: "",
    access_level: "",
  });

  const fetchBaseData = async () => {
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

    const { baseDept, basereportStatus, baseCatagory } = data.baseConfig;
    setBaseSelect({
      departments: baseDept,
      status: basereportStatus,
      catagory: baseCatagory,
    });
  };

  React.useEffect(() => {
    fetchBaseData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // TODO: implement submit logic
      await new Promise((r) => setTimeout(r, 1000));
    } finally {
      setIsSubmitting(false);
    }
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
                <FieldLabel htmlFor="rp_code">
                  Code <span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <Input
                  id="rp_code"
                  placeholder="e.g. Anes-0001"
                  required
                  autoComplete="off"
                />
                <FieldDescription>Format: Department-XXXX</FieldDescription>
              </Field>

              {/* Name */}
              <Field>
                <FieldLabel htmlFor="rp_name">
                  Name <span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <Input
                  id="rp_name"
                  placeholder="Enter report name"
                  required
                  autoComplete="off"
                />
              </Field>

              {/* Category + Department – inline 2-col */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="rp_catagory">Category</FieldLabel>
                  <Select>
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
                  <Select>
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
                <Select>
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
              <Field>
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
              </Field>
              {/* File Upload */}
              <FileUpload
                label="Attachments"
                accept="all"
                multiple
                maxSizeMB={20}
              />

              {/* Description */}
              <Field>
                <FieldLabel htmlFor="rp_description">Description</FieldLabel>
                <Textarea
                  id="rp_description"
                  placeholder="Add any additional information about this report…"
                  className="resize-none min-h-[96px]"
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
