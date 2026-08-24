"use client";

import React, { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
import { useReportEditorCounts } from "@/hook/useReportEditorCounts";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";
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
  const t = useTranslations("reports.editor");
  const tc = useTranslations("common");
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
  const { counts, refresh: refreshCounts } = useReportEditorCounts(createdId);
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
        toast.error(t("errors.missingFiles"));
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

      toast.success(t("success.create"));
      setCreatedId(data.data.id);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to create report", error);
      }
      toast.error(t("errors.createFailed"));
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
    <ContentLayout title={t("createPageTitle")}>
      <DefaultBreadcrumb
        items={[
          { label: tc("breadcrumbDashboard"), href: "/dashboard" },
          { label: t("createPageTitle") },
        ]}
      />
      <Separator className="my-5" />

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{t("createHeading")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {createdId ? t("createSubtitleLocked") : t("createSubtitleUnlocked")}
        </p>
      </div>

      <Tabs defaultValue="info" orientation="vertical" className="group flex items-start gap-6">
        <TabsList className="w-48 flex-none sticky top-4">
          <TabsTrigger value="info">{t("tabs.info")}</TabsTrigger>
          <TabsTrigger value="param" disabled={locked} title={locked ? t("saveFirstHint") : undefined}>
            <span>{t("tabs.param")}</span>
            {counts.param > 0 && <span className="text-xs text-muted-foreground">{counts.param}</span>}
          </TabsTrigger>
          <TabsTrigger value="query" disabled={locked} title={locked ? t("saveFirstHint") : undefined}>
            <span>{t("tabs.query")}</span>
            {counts.queryMain + counts.querySub > 0 && (
              <span className="text-xs text-muted-foreground">{counts.queryMain}+{counts.querySub}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sub" disabled={locked} title={locked ? t("saveFirstHint") : undefined}>
            <span>{t("tabs.sub")}</span>
            {counts.sub > 0 && <span className="text-xs text-muted-foreground">{counts.sub}</span>}
          </TabsTrigger>
          <TabsTrigger value="doc" disabled={locked} title={locked ? t("saveFirstHint") : undefined}>{t("tabs.doc")}</TabsTrigger>
          <TabsTrigger value="history" disabled={locked} title={locked ? t("saveFirstHint") : undefined}>{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-0 flex-1 min-w-0">
          {createdId && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4 flex-none" />
              {t("createdBannerPrefix")}{" "}
              <Link href={`/reports/report-edit/${createdId}`} className="underline font-medium">{t("editReportLink")}</Link>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
                </div>
                <CardDescription>{t("cardDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Code */}
                <Field>
                  <FieldLabel htmlFor="code">
                    {t("codeLabel")} <span className="text-destructive ml-0.5">*</span>
                  </FieldLabel>
                  <Input
                    id="code"
                    name="code"
                    placeholder={t("codePlaceholder")}
                    required
                    autoComplete="off"
                    disabled={!!createdId}
                    value={reportData?.code}
                    onChange={handleInputChange}
                  />
                  <FieldDescription>{t("codeHint")}</FieldDescription>
                </Field>

                {/* Name */}
                <Field>
                  <FieldLabel htmlFor="name">
                    {t("nameLabel")} <span className="text-destructive ml-0.5">*</span>
                  </FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    placeholder={t("namePlaceholder")}
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
                    <FieldLabel htmlFor="rp_catagory">{t("categoryLabel")}</FieldLabel>
                    <Select disabled={!!createdId} value={reportData?.category} onValueChange={(e) => handleSelectChange("category", e)}>
                      <SelectTrigger id="rp_catagory">
                        <SelectValue placeholder={t("categoryPlaceholder")} />
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
                    <FieldLabel htmlFor="rp_department">{t("departmentLabel")}</FieldLabel>
                    <Select disabled={!!createdId} value={reportData?.department} onValueChange={(e) => handleSelectChange("department", e)}>
                      <SelectTrigger id="rp_department">
                        <SelectValue placeholder={t("departmentPlaceholder")} />
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

                {/* Output Type + Access Level – inline 2-col */}
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="rp_output_type">{t("outputTypeLabel")}</FieldLabel>
                    <Select disabled={!!createdId} value={reportData?.output_type} onValueChange={(e) => handleSelectChange("output_type", e)}>
                      <SelectTrigger id="rp_output_type">
                        <SelectValue placeholder={t("outputTypePlaceholder")} />
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
                    <FieldDescription>{t("outputTypeHint")}</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="rp_access_level">{t("accessLevelLabel")}</FieldLabel>
                    <Select disabled={!!createdId} value={reportData?.access_level} onValueChange={(e) => handleSelectChange("access_level", e)}>
                      <SelectTrigger id="rp_access_level">
                        <SelectValue placeholder={t("accessLevelPlaceholder")} />
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
                      {t("accessLevelHint")}
                    </FieldDescription>
                  </Field>
                </div>

                {/* Status */}
                <Field>
                  <FieldLabel htmlFor="rp_status">{t("statusLabel")}</FieldLabel>
                  <Select disabled={!!createdId} value={reportData?.status} onValueChange={(e) => handleSelectChange("status", e)}>
                    <SelectTrigger id="rp_status">
                      <SelectValue placeholder={t("statusPlaceholder")} />
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

                {/* File Upload */}
                <FileUpload
                  label={t("fileLabel")}
                  accept="all"
                  multiple
                  maxSizeMB={20}
                  disabled={!!createdId}
                  onFilesChange={(files) => setReportData(prev => ({ ...prev, files }))}
                  fileOutside={reportData?.files}
                />

                {/* Description */}
                <Field>
                  <FieldLabel htmlFor="description">{t("descriptionLabel")}</FieldLabel>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder={t("descriptionPlaceholder")}
                    className="resize-none min-h-[96px]"
                    disabled={!!createdId}
                    value={reportData?.description}
                    onChange={handleInputChange}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field orientation="horizontal">
                    <Checkbox id="is_downloadable" disabled={!!createdId} checked={reportData?.is_downloadable} onCheckedChange={(e) => handleSelectChange("is_downloadable", e)} />
                    <FieldLabel htmlFor="is_downloadable" className="font-normal">
                      {t("isDownloadable")}
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id="is_editable" disabled={!!createdId} checked={reportData?.is_editable} onCheckedChange={(e) => handleSelectChange("is_editable", e)} />
                    <FieldLabel htmlFor="is_editable" className="font-normal">
                      {t("isEditable")}
                    </FieldLabel>
                  </Field>
                </div>

              </CardContent>
            </Card>

            {/* ── Action bar ───────────────────────────────────────────────────── */}
            {!createdId && (
              <div className="mt-6 flex items-center justify-end gap-3">
                <Button variant="outline" type="button">
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("creating")}
                    </>
                  ) : (
                    t("createButton")
                  )}
                </Button>
              </div>
            )}
          </form>
        </TabsContent>

        <TabsContent value="param" className="mt-0 flex-1 min-w-0">
          {createdId && <ParamTab reportId={createdId} onDataChange={refreshCounts} />}
        </TabsContent>

        <TabsContent value="query" className="mt-0 flex-1 min-w-0">
          {createdId && <QueryTab reportId={createdId} onDataChange={refreshCounts} />}
        </TabsContent>

        <TabsContent value="sub" className="mt-0 flex-1 min-w-0">
          {createdId && <SubTab reportId={createdId} onDataChange={refreshCounts} />}
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
