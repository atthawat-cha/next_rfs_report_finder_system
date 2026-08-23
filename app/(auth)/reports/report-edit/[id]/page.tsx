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
import FileUpload, { AllowedFileType } from "@/components/shared/fileuploading";
import { QuerySummary } from "@/components/shared/querySummary";
import { ReportPermissionsDrawer } from "@/components/shared/reportPermissionsDrawer";
import {
  Loader2,
  FileText,
  Layers,
  Database,
  Variable as VariableIcon,
  Shield,
  History,
  Share2,
  Copy,
  FolderOpen,
  GitBranch,
} from "lucide-react";
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

type SingularFileKind = "BLANK_FORM" | "SAMPLE_FILLED_FORM" | "SAMPLE_DATA";

interface ReportFileRow {
  id: string;
  file_kind: SingularFileKind | "REFERENCE_DOC";
  file_path: string;
  file_name: string;
  version: string;
}

interface ReportQueryRow {
  id: string;
  name: string;
  sql_text: string;
  is_main: boolean;
  version: string;
}

interface ReportVariableRow {
  id: string;
  name: string;
  label: string | null;
  data_type: "STRING" | "NUMBER" | "DATE" | "BOOLEAN";
  default_value: string | null;
  is_required: boolean;
  sort_order: number;
}

const DATA_TYPES: ReportVariableRow["data_type"][] = ["STRING", "NUMBER", "DATE", "BOOLEAN"];

const EMPTY_NEW_QUERY = { name: "", sql_text: "", is_main: false };
const EMPTY_NEW_VARIABLE = {
  name: "",
  label: "",
  data_type: "STRING" as ReportVariableRow["data_type"],
  default_value: "",
  is_required: false,
  sort_order: 0,
};

interface HistoryFileRow {
  id: string;
  file_kind: SingularFileKind;
  file_name: string;
  version: string;
  is_current: boolean;
  created_at: string;
}

interface QueryVersionRow {
  id: string;
  version: string;
  sql_text: string;
  change_log: string | null;
  created_at: string;
}

interface HistoryQueryRow extends ReportQueryRow {
  report_query_versions: QueryVersionRow[];
}

interface VersionHistory {
  files: Record<string, HistoryFileRow[]>;
  queries: HistoryQueryRow[];
}

const EMPTY_HISTORY: VersionHistory = { files: {}, queries: [] };

interface ReportShareRow {
  id: string;
  share_type: "USER" | "DEPARTMENT" | "LINK";
  shared_with: string | null;
  share_token: string | null;
  target_name: string | null;
  can_download: boolean;
  can_edit: boolean;
  expires_at: string | null;
}

const EMPTY_NEW_SHARE = {
  share_type: "LINK" as ReportShareRow["share_type"],
  shared_with: "",
  can_download: true,
  can_edit: false,
  expires_at: "",
};

type SubReportSlot = "HEADER" | "DETAIL" | "FOOTER";
type SubReportSourceType = "UPLOAD" | "LINKED_REPORT";

interface SubReportRow {
  id: string;
  name: string;
  slot: SubReportSlot;
  source_type: SubReportSourceType;
  linked_report_id: string | null;
  file_path: string | null;
  file_name: string | null;
  linked_report: { id: string; code: string; name_th: string } | null;
}

const SLOT_OPTIONS: SubReportSlot[] = ["HEADER", "DETAIL", "FOOTER"];
const SLOT_LABEL: Record<SubReportSlot, string> = {
  HEADER: "Header band",
  DETAIL: "Detail band",
  FOOTER: "Footer band",
};

const EMPTY_NEW_SUB_REPORT = {
  name: "",
  slot: "DETAIL" as SubReportSlot,
  source_type: "UPLOAD" as SubReportSourceType,
  linked_report_id: "",
};

const FILE_KINDS_BY_OUTPUT_TYPE: Record<string, { kind: SingularFileKind; label: string; accept: AllowedFileType }[]> = {
  PRINT_FORM: [
    { kind: "BLANK_FORM", label: "แบบฟอร์มเปล่า (PDF)", accept: "pdf" },
    { kind: "SAMPLE_FILLED_FORM", label: "ตัวอย่างที่กรอกแล้ว (PDF)", accept: "pdf" },
  ],
  DATA_REPORT: [
    { kind: "SAMPLE_DATA", label: "ไฟล์ตัวอย่างข้อมูล (Excel)", accept: "excel" },
  ],
};

export default function ReportEdit() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reportId = params.id;

  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [outputType, setOutputType] = React.useState<string>("DATA_REPORT");
  const [currentFiles, setCurrentFiles] = React.useState<ReportFileRow[]>([]);
  const [pendingFiles, setPendingFiles] = React.useState<Record<string, File[]>>({});
  const [pendingReferenceDocs, setPendingReferenceDocs] = React.useState<File[]>([]);
  const [queries, setQueries] = React.useState<ReportQueryRow[]>([]);
  const [newQuery, setNewQuery] = React.useState(EMPTY_NEW_QUERY);
  const [editingQueryId, setEditingQueryId] = React.useState<string | null>(null);
  const [queryDraft, setQueryDraft] = React.useState({ name: "", sql_text: "", is_main: false, change_log: "" });
  const [variables, setVariables] = React.useState<ReportVariableRow[]>([]);
  const [newVariable, setNewVariable] = React.useState(EMPTY_NEW_VARIABLE);
  const [editingVariableId, setEditingVariableId] = React.useState<string | null>(null);
  const [variableDraft, setVariableDraft] = React.useState(EMPTY_NEW_VARIABLE);
  const [subReports, setSubReports] = React.useState<SubReportRow[]>([]);
  const [newSubReport, setNewSubReport] = React.useState(EMPTY_NEW_SUB_REPORT);
  const [newSubReportFile, setNewSubReportFile] = React.useState<File[]>([]);
  const [editingSubReportId, setEditingSubReportId] = React.useState<string | null>(null);
  const [subReportDraft, setSubReportDraft] = React.useState({ name: "", slot: "DETAIL" as SubReportSlot });
  const [reportOptions, setReportOptions] = React.useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = React.useState<SelectOption[]>([]);
  const [permissionsOpen, setPermissionsOpen] = React.useState(false);
  const [history, setHistory] = React.useState<VersionHistory>(EMPTY_HISTORY);
  const [shares, setShares] = React.useState<ReportShareRow[]>([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<SelectOption[]>([]);
  const [newShare, setNewShare] = React.useState(EMPTY_NEW_SHARE);
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
      const [reportRes, baseRes, queriesRes, variablesRes, usersRes, historyRes, sharesRes, deptRes, subReportsRes, reportsRes] = await Promise.all([
        fetch(`/api/reports/report/manage/${reportId}`, { credentials: "include" }),
        fetch("/api/baseconfig/selections", { credentials: "include" }),
        fetch(`/api/reports/${reportId}/queries`, { credentials: "include" }),
        fetch(`/api/reports/${reportId}/variables`, { credentials: "include" }),
        fetch("/api/users/user", { credentials: "include" }),
        fetch(`/api/reports/${reportId}/versions`, { credentials: "include" }),
        fetch(`/api/reports/${reportId}/shares`, { credentials: "include" }),
        fetch("/api/users/departments", { credentials: "include" }),
        fetch(`/api/reports/${reportId}/sub-reports`, { credentials: "include" }),
        fetch("/api/reports/report/manage?pageSize=200", { credentials: "include" }),
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
      setCurrentFiles(report.report_files ?? []);

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

      if (queriesRes.ok) {
        const queriesJson = await queriesRes.json();
        if (queriesJson?.success) setQueries(queriesJson.data);
      }

      if (variablesRes.ok) {
        const variablesJson = await variablesRes.json();
        if (variablesJson?.success) setVariables(variablesJson.data);
      }

      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        if (usersJson?.success) {
          setUserOptions(
            usersJson.data.map((u: { id: string; first_name: string; last_name: string; username: string }) => ({
              id: u.id,
              name: `${u.first_name} ${u.last_name}`.trim() || u.username,
            }))
          );
        }
      }

      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        if (historyJson?.success) setHistory(historyJson.data);
      }

      if (sharesRes.ok) {
        const sharesJson = await sharesRes.json();
        if (sharesJson?.success) setShares(sharesJson.data);
      }

      if (deptRes.ok) {
        const deptJson = await deptRes.json();
        if (Array.isArray(deptJson?.data)) {
          setDepartmentOptions(deptJson.data.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
        }
      }

      if (subReportsRes.ok) {
        const subReportsJson = await subReportsRes.json();
        if (subReportsJson?.success) setSubReports(subReportsJson.data);
      }

      if (reportsRes.ok) {
        const reportsJson = await reportsRes.json();
        if (reportsJson?.success) {
          setReportOptions(
            reportsJson.data
              .filter((r: { id: string }) => r.id !== reportId)
              .map((r: { id: string; code: string; name_th: string }) => ({ id: r.id, name: `${r.code} — ${r.name_th}` }))
          );
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

  const handleUploadFile = async (kind: string) => {
    const file = pendingFiles[kind]?.[0];
    if (!file) {
      toast.error("Please select a file first");
      return;
    }
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("file_kind", kind);

    const res = await fetch(`/api/reports/${reportId}/files`, {
      method: "POST",
      credentials: "include",
      body: uploadForm,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to upload file");
      return;
    }
    toast.success(`${kind} uploaded`);
    setPendingFiles((prev) => ({ ...prev, [kind]: [] }));
    fetchAll();
  };

  const handleDeleteFile = async (kind: string) => {
    const res = await fetch(`/api/reports/${reportId}/files?fileKind=${kind}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Failed to delete file");
      return;
    }
    toast.success(`${kind} removed`);
    fetchAll();
  };

  const handleUploadReferenceDocs = async () => {
    if (pendingReferenceDocs.length === 0) {
      toast.error("Please select at least one file");
      return;
    }
    let failed = 0;
    for (const file of pendingReferenceDocs) {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("file_kind", "REFERENCE_DOC");
      const res = await fetch(`/api/reports/${reportId}/files`, {
        method: "POST",
        credentials: "include",
        body: uploadForm,
      });
      if (!res.ok) failed += 1;
    }
    if (failed > 0) {
      toast.error(`อัปโหลดไม่สำเร็จ ${failed} ไฟล์`);
    } else {
      toast.success("อัปโหลดเอกสารอ้างอิงสำเร็จ");
    }
    setPendingReferenceDocs([]);
    fetchAll();
  };

  const handleDeleteReferenceDoc = async (fileId: string) => {
    const res = await fetch(`/api/reports/${reportId}/files?id=${fileId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Failed to delete file");
      return;
    }
    toast.success("ลบเอกสารอ้างอิงแล้ว");
    fetchAll();
  };

  const handleAddQuery = async () => {
    if (!newQuery.name.trim() || !newQuery.sql_text.trim()) {
      toast.error("Name and SQL text are required");
      return;
    }
    const res = await fetch(`/api/reports/${reportId}/queries`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newQuery),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to add query");
      return;
    }
    toast.success("Query added");
    setNewQuery(EMPTY_NEW_QUERY);
    fetchAll();
  };

  const startEditQuery = (row: ReportQueryRow) => {
    setEditingQueryId(row.id);
    setQueryDraft({ name: row.name, sql_text: row.sql_text, is_main: row.is_main, change_log: "" });
  };

  const handleSaveQuery = async () => {
    if (!editingQueryId) return;
    const res = await fetch(`/api/reports/${reportId}/queries`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingQueryId, ...queryDraft }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to save query");
      return;
    }
    toast.success("Query saved");
    setEditingQueryId(null);
    fetchAll();
  };

  const handleSetMainQuery = async (row: ReportQueryRow) => {
    const res = await fetch(`/api/reports/${reportId}/queries`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, is_main: true }),
    });
    if (!res.ok) {
      toast.error("Failed to set as main query");
      return;
    }
    toast.success(`"${row.name}" set as main query`);
    fetchAll();
  };

  const handleDeleteQuery = async (row: ReportQueryRow) => {
    const res = await fetch(`/api/reports/${reportId}/queries?id=${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Failed to delete query");
      return;
    }
    toast.success("Query deleted");
    fetchAll();
  };

  const handleAddVariable = async () => {
    if (!newVariable.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const res = await fetch(`/api/reports/${reportId}/variables`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVariable),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to add variable");
      return;
    }
    toast.success("Variable added");
    setNewVariable(EMPTY_NEW_VARIABLE);
    fetchAll();
  };

  const startEditVariable = (row: ReportVariableRow) => {
    setEditingVariableId(row.id);
    setVariableDraft({
      name: row.name,
      label: row.label ?? "",
      data_type: row.data_type,
      default_value: row.default_value ?? "",
      is_required: row.is_required,
      sort_order: row.sort_order,
    });
  };

  const handleSaveVariable = async () => {
    if (!editingVariableId) return;
    const res = await fetch(`/api/reports/${reportId}/variables`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingVariableId, ...variableDraft }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to save variable");
      return;
    }
    toast.success("Variable saved");
    setEditingVariableId(null);
    fetchAll();
  };

  const handleDeleteVariable = async (row: ReportVariableRow) => {
    const res = await fetch(`/api/reports/${reportId}/variables?id=${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Failed to delete variable");
      return;
    }
    toast.success("Variable deleted");
    fetchAll();
  };

  const handleAddSubReport = async () => {
    if (!newSubReport.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (newSubReport.source_type === "UPLOAD" && newSubReportFile.length === 0) {
      toast.error("Please select a file to upload");
      return;
    }
    if (newSubReport.source_type === "LINKED_REPORT" && !newSubReport.linked_report_id) {
      toast.error("Please choose a report to link");
      return;
    }

    const form = new FormData();
    form.append("name", newSubReport.name);
    form.append("slot", newSubReport.slot);
    form.append("source_type", newSubReport.source_type);
    if (newSubReport.source_type === "UPLOAD") {
      form.append("file", newSubReportFile[0]);
    } else {
      form.append("linked_report_id", newSubReport.linked_report_id);
    }

    const res = await fetch(`/api/reports/${reportId}/sub-reports`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to add sub-report");
      return;
    }
    toast.success("Sub-report added");
    setNewSubReport(EMPTY_NEW_SUB_REPORT);
    setNewSubReportFile([]);
    fetchAll();
  };

  const startEditSubReport = (row: SubReportRow) => {
    setEditingSubReportId(row.id);
    setSubReportDraft({ name: row.name, slot: row.slot });
  };

  const handleSaveSubReport = async () => {
    if (!editingSubReportId) return;
    const res = await fetch(`/api/reports/${reportId}/sub-reports`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingSubReportId, ...subReportDraft }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to save sub-report");
      return;
    }
    toast.success("Sub-report saved");
    setEditingSubReportId(null);
    fetchAll();
  };

  const handleDeleteSubReport = async (row: SubReportRow) => {
    const res = await fetch(`/api/reports/${reportId}/sub-reports?id=${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Failed to delete sub-report");
      return;
    }
    toast.success("Sub-report deleted");
    fetchAll();
  };

  const handleRollbackFile = async (row: HistoryFileRow) => {
    const res = await fetch(`/api/reports/${reportId}/versions/rollback`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "file", report_files_id: row.id }),
    });
    if (!res.ok) {
      toast.error("Rollback failed");
      return;
    }
    toast.success(`Rolled back to v${row.version}`);
    fetchAll();
  };

  const handleRollbackQuery = async (version: QueryVersionRow) => {
    const res = await fetch(`/api/reports/${reportId}/versions/rollback`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "query", version_id: version.id }),
    });
    if (!res.ok) {
      toast.error("Rollback failed");
      return;
    }
    toast.success(`Rolled back to v${version.version}`);
    fetchAll();
  };

  const handleAddShare = async () => {
    if (newShare.share_type !== "LINK" && !newShare.shared_with) {
      toast.error(newShare.share_type === "USER" ? "Please choose a user" : "Please choose a department");
      return;
    }
    const res = await fetch(`/api/reports/${reportId}/shares`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        share_type: newShare.share_type,
        ...(newShare.share_type !== "LINK" ? { shared_with: newShare.shared_with } : {}),
        can_download: newShare.can_download,
        can_edit: newShare.can_edit,
        expires_at: newShare.expires_at ? new Date(newShare.expires_at).toISOString() : null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to create share");
      return;
    }
    toast.success("Share created");
    setNewShare(EMPTY_NEW_SHARE);
    fetchAll();
  };

  const handleRevokeShare = async (row: ReportShareRow) => {
    const res = await fetch(`/api/reports/${reportId}/shares?id=${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Failed to revoke share");
      return;
    }
    toast.success("Share revoked");
    fetchAll();
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/shares/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Copied link to clipboard");
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

  const fileKinds = FILE_KINDS_BY_OUTPUT_TYPE[outputType] ?? [];
  const referenceDocs = currentFiles.filter((f) => f.file_kind === "REFERENCE_DOC");
  const mainQuery = queries.find((q) => q.is_main) ?? null;
  const subQueries = queries.filter((q) => !q.is_main);
  const subReportsBySlot = SLOT_OPTIONS.map((slot) => ({
    slot,
    rows: subReports.filter((s) => s.slot === slot),
  }));

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

      <Tabs defaultValue="info" orientation="vertical" className="flex items-start gap-6">
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

        {/* ══════════════════ PARAM ══════════════════ */}
        <TabsContent value="param" className="mt-0 flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <VariableIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Variables</CardTitle>
              </div>
              <CardDescription>ตัวแปรอ้างอิงของรายงาน (ข้อมูลอ้างอิงเท่านั้น) — เพิ่มได้มากกว่า 1 ตัว</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {variables.map((v) => (
                <div key={v.id} className="border rounded-md p-3 space-y-2">
                  {editingVariableId === v.id ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={variableDraft.name}
                        onChange={(e) => setVariableDraft((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Name"
                      />
                      <Input
                        value={variableDraft.label}
                        onChange={(e) => setVariableDraft((prev) => ({ ...prev, label: e.target.value }))}
                        placeholder="Label"
                      />
                      <Select
                        value={variableDraft.data_type}
                        onValueChange={(val) => setVariableDraft((prev) => ({ ...prev, data_type: val as ReportVariableRow["data_type"] }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Data type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {DATA_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Input
                        value={variableDraft.default_value}
                        onChange={(e) => setVariableDraft((prev) => ({ ...prev, default_value: e.target.value }))}
                        placeholder="Default value"
                      />
                      <Input
                        type="number"
                        value={variableDraft.sort_order}
                        onChange={(e) => setVariableDraft((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                        placeholder="Sort order"
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`v-required-${v.id}`}
                          checked={variableDraft.is_required}
                          onCheckedChange={(c) => setVariableDraft((prev) => ({ ...prev, is_required: c === true }))}
                        />
                        <FieldLabel htmlFor={`v-required-${v.id}`} className="font-normal">Required</FieldLabel>
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditingVariableId(null)}>
                          Cancel
                        </Button>
                        <Button type="button" size="sm" onClick={handleSaveVariable}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">{v.name}</span>
                        {v.label && <span className="text-muted-foreground"> ({v.label})</span>}
                        <span className="ml-2 text-xs rounded bg-muted px-1.5 py-0.5">{v.data_type}</span>
                        {v.is_required && (
                          <span className="ml-2 text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">Required</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => startEditVariable(v)}>
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteVariable(v)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="border-t pt-4 grid grid-cols-2 gap-2">
                <Input
                  value={newVariable.name}
                  onChange={(e) => setNewVariable((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Name"
                />
                <Input
                  value={newVariable.label}
                  onChange={(e) => setNewVariable((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Label"
                />
                <Select
                  value={newVariable.data_type}
                  onValueChange={(val) => setNewVariable((prev) => ({ ...prev, data_type: val as ReportVariableRow["data_type"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DATA_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Input
                  value={newVariable.default_value}
                  onChange={(e) => setNewVariable((prev) => ({ ...prev, default_value: e.target.value }))}
                  placeholder="Default value"
                />
                <Input
                  type="number"
                  value={newVariable.sort_order}
                  onChange={(e) => setNewVariable((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                  placeholder="Sort order"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="new-v-required"
                    checked={newVariable.is_required}
                    onCheckedChange={(c) => setNewVariable((prev) => ({ ...prev, is_required: c === true }))}
                  />
                  <FieldLabel htmlFor="new-v-required" className="font-normal">Required</FieldLabel>
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={handleAddVariable}>
                    Add Variable
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════ QUERY ══════════════════ */}
        <TabsContent value="query" className="mt-0 flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Main Query</CardTitle>
              </div>
              <CardDescription>
                คิวรี่หลักของรายงาน — มีได้เพียง 1 อัน ใช้เป็นข้อมูลอ้างอิงเท่านั้น (Reference/documentation only — the app never executes these queries)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mainQuery ? (
                <div className="border rounded-md p-3 space-y-2">
                  {editingQueryId === mainQuery.id ? (
                    <QueryEditForm
                      draft={queryDraft}
                      setDraft={setQueryDraft}
                      onCancel={() => setEditingQueryId(null)}
                      onSave={handleSaveQuery}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{mainQuery.name}</span>
                          <span className="text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">Main</span>
                          <span className="text-xs text-muted-foreground">v{mainQuery.version}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => startEditQuery(mainQuery)}>
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteQuery(mainQuery)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <QuerySummary sql={mainQuery.sql_text} maxHeight="16rem" />
                    </>
                  )}
                </div>
              ) : (
                <FieldDescription>ยังไม่มี main query — เพิ่มคิวรี่ใหม่ด้านล่างแล้วติ๊ก &quot;Main query&quot; หรือกด &quot;Set as main&quot; ที่ sub query ที่มีอยู่</FieldDescription>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Sub Queries</CardTitle>
              <CardDescription>คิวรี่รองที่แนบไว้เพื่ออ้างอิงเพิ่มเติม</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subQueries.length === 0 && <FieldDescription>ยังไม่มี sub query</FieldDescription>}
              {subQueries.map((q) => (
                <div key={q.id} className="border rounded-md p-3 space-y-2">
                  {editingQueryId === q.id ? (
                    <QueryEditForm
                      draft={queryDraft}
                      setDraft={setQueryDraft}
                      onCancel={() => setEditingQueryId(null)}
                      onSave={handleSaveQuery}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{q.name}</span>
                          <span className="text-xs text-muted-foreground">v{q.version}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleSetMainQuery(q)}>
                            Set as main
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => startEditQuery(q)}>
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteQuery(q)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <QuerySummary sql={q.sql_text} maxHeight="16rem" />
                    </>
                  )}
                </div>
              ))}

              <div className="border-t pt-4 space-y-2">
                <FieldLabel>Add query</FieldLabel>
                <Input
                  value={newQuery.name}
                  onChange={(e) => setNewQuery((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Query name"
                />
                <Textarea
                  className="resize-none min-h-[80px] font-mono text-xs"
                  value={newQuery.sql_text}
                  onChange={(e) => setNewQuery((prev) => ({ ...prev, sql_text: e.target.value }))}
                  placeholder="SQL text"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-q-main"
                      checked={newQuery.is_main}
                      onCheckedChange={(v) => setNewQuery((prev) => ({ ...prev, is_main: v === true }))}
                    />
                    <FieldLabel htmlFor="new-q-main" className="font-normal">Main query</FieldLabel>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddQuery}>
                    Add Query
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════ SUB (SUB-REPORTS) ══════════════════ */}
        <TabsContent value="sub" className="mt-0 flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Sub-reports</CardTitle>
              </div>
              <CardDescription>
                รายงานย่อยที่ฝังอยู่ภายในรายงานนี้ — อัปโหลดไฟล์ดีไซน์ย่อย (.jrxml/.rpt/.pdf) หรือลิงก์ไปยังรายงานอื่นที่มีอยู่แล้ว จัดวางตามตำแหน่ง (slot)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subReportsBySlot.map(({ slot, rows }) => (
                <div key={slot} className="space-y-2">
                  <FieldLabel>{SLOT_LABEL[slot]}</FieldLabel>
                  {rows.length === 0 ? (
                    <FieldDescription>ยังไม่มีรายงานย่อยในตำแหน่งนี้</FieldDescription>
                  ) : (
                    <div className="space-y-2">
                      {rows.map((row) => (
                        <div key={row.id} className="border rounded-md p-3">
                          {editingSubReportId === row.id ? (
                            <div className="space-y-2">
                              <Input
                                value={subReportDraft.name}
                                onChange={(e) => setSubReportDraft((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Name"
                              />
                              <Select
                                value={subReportDraft.slot}
                                onValueChange={(v) => setSubReportDraft((prev) => ({ ...prev, slot: v as SubReportSlot }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {SLOT_OPTIONS.map((s) => (
                                      <SelectItem key={s} value={s}>{SLOT_LABEL[s]}</SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                              <div className="flex justify-end gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => setEditingSubReportId(null)}>
                                  Cancel
                                </Button>
                                <Button type="button" size="sm" onClick={handleSaveSubReport}>
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{row.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {row.source_type === "UPLOAD"
                                    ? `อัปโหลดไฟล์ · ${row.file_name}`
                                    : `ลิงก์รายงาน: ${row.linked_report?.code ?? row.linked_report_id}`}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-none">
                                <Button type="button" size="sm" variant="ghost" onClick={() => startEditSubReport(row)}>
                                  Edit
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteSubReport(row)}>
                                  Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="border-t pt-4 space-y-3">
                <FieldLabel>เพิ่ม Sub-report</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newSubReport.name}
                    onChange={(e) => setNewSubReport((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Name"
                  />
                  <Select
                    value={newSubReport.slot}
                    onValueChange={(v) => setNewSubReport((prev) => ({ ...prev, slot: v as SubReportSlot }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {SLOT_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{SLOT_LABEL[s]}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <Select
                  value={newSubReport.source_type}
                  onValueChange={(v) => setNewSubReport((prev) => ({ ...prev, source_type: v as SubReportSourceType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="UPLOAD">อัปโหลดไฟล์ดีไซน์ย่อย (.jrxml / .rpt / .pdf)</SelectItem>
                      <SelectItem value="LINKED_REPORT">ลิงก์รายงานที่มีอยู่แล้ว</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {newSubReport.source_type === "UPLOAD" ? (
                  <FileUpload
                    accept="all"
                    multiple={false}
                    onFilesChange={setNewSubReportFile}
                    fileOutside={newSubReportFile}
                  />
                ) : (
                  <Select
                    value={newSubReport.linked_report_id}
                    onValueChange={(v) => setNewSubReport((prev) => ({ ...prev, linked_report_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกรายงานที่ต้องการลิงก์" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {reportOptions.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}

                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={handleAddSubReport}>
                    + Add Sub-report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════ DOC ══════════════════ */}
        <TabsContent value="doc" className="mt-0 flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Files</CardTitle>
              </div>
              <CardDescription>
                จัดการไฟล์ตาม output_type — อัปโหลดไฟล์ใหม่จะแทนที่ไฟล์เดิม (เก็บเวอร์ชันเก่าไว้ ดูได้ในแท็บ History)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fileKinds.map(({ kind, label, accept }) => {
                const current = currentFiles.find((f) => f.file_kind === kind);
                return (
                  <div key={kind} className="space-y-2 border-b pb-4 last:border-b-0">
                    <FieldLabel>{label}</FieldLabel>
                    {current ? (
                      <div className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-2">
                        <span className="truncate">{current.file_name} (v{current.version})</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteFile(kind)}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <FieldDescription>ยังไม่มีไฟล์</FieldDescription>
                    )}
                    <FileUpload
                      accept={accept}
                      multiple={false}
                      onFilesChange={(files) => setPendingFiles((prev) => ({ ...prev, [kind]: files }))}
                      fileOutside={pendingFiles[kind] ?? []}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!pendingFiles[kind]?.length}
                      onClick={() => handleUploadFile(kind)}
                    >
                      Upload {label}
                    </Button>
                  </div>
                );
              })}

              <div className="space-y-2">
                <FieldLabel>เอกสารอ้างอิงเพิ่มเติม</FieldLabel>
                <FieldDescription>สำหรับคู่มือ/หมายเหตุประกอบรายงาน ที่ผู้ใช้พรีวิวหรือดาวน์โหลดได้ — เพิ่มได้หลายไฟล์พร้อมกัน</FieldDescription>
                {referenceDocs.length === 0 ? (
                  <FieldDescription>ยังไม่มีเอกสารอ้างอิง</FieldDescription>
                ) : (
                  <div className="space-y-1">
                    {referenceDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-2">
                        <span className="truncate">{doc.file_name}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteReferenceDoc(doc.id)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <FileUpload
                  accept="all"
                  multiple
                  onFilesChange={setPendingReferenceDocs}
                  fileOutside={pendingReferenceDocs}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pendingReferenceDocs.length === 0}
                  onClick={handleUploadReferenceDocs}
                >
                  Upload เอกสารอ้างอิง
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Sharing</CardTitle>
              </div>
              <CardDescription>
                แชร์รายงานนี้ให้ผู้ใช้/แผนก หรือสร้างลิงก์สาธารณะ (ไม่ต้อง login)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shares.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs rounded bg-muted px-1.5 py-0.5">
                        {s.share_type === "USER" ? "User" : s.share_type === "DEPARTMENT" ? "Department" : "Link"}
                      </span>
                      {s.can_download && <span className="text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">Download</span>}
                      {s.can_edit && <span className="text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">Edit</span>}
                      {s.expires_at && (
                        <span className="text-xs text-muted-foreground">
                          หมดอายุ {new Date(s.expires_at).toLocaleDateString("th-TH")}
                        </span>
                      )}
                    </div>
                    {s.share_type === "LINK" && s.share_token ? (
                      <button
                        type="button"
                        onClick={() => handleCopyLink(s.share_token as string)}
                        className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground truncate"
                      >
                        <Copy className="h-3 w-3" /> /shares/{s.share_token.slice(0, 12)}…
                      </button>
                    ) : (
                      <div className="mt-1 text-xs text-muted-foreground truncate">{s.target_name}</div>
                    )}
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleRevokeShare(s)}>
                    Revoke
                  </Button>
                </div>
              ))}

              <div className="border-t pt-4 space-y-3">
                <FieldLabel>สร้างการแชร์ใหม่</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={newShare.share_type}
                    onValueChange={(v) => setNewShare((prev) => ({ ...prev, share_type: v as ReportShareRow["share_type"], shared_with: "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Share type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="LINK">Public Link</SelectItem>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="DEPARTMENT">Department</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {newShare.share_type !== "LINK" && (
                    <Select
                      value={newShare.shared_with}
                      onValueChange={(v) => setNewShare((prev) => ({ ...prev, shared_with: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={newShare.share_type === "USER" ? "Select user" : "Select department"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(newShare.share_type === "USER" ? userOptions : departmentOptions).map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-share-download"
                      checked={newShare.can_download}
                      onCheckedChange={(c) => setNewShare((prev) => ({ ...prev, can_download: c === true }))}
                    />
                    <FieldLabel htmlFor="new-share-download" className="font-normal">Can download</FieldLabel>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-share-edit"
                      checked={newShare.can_edit}
                      onCheckedChange={(c) => setNewShare((prev) => ({ ...prev, can_edit: c === true }))}
                    />
                    <FieldLabel htmlFor="new-share-edit" className="font-normal">Can edit</FieldLabel>
                  </div>
                  <div className="flex items-center gap-2">
                    <FieldLabel htmlFor="new-share-expires" className="font-normal">Expires</FieldLabel>
                    <Input
                      id="new-share-expires"
                      type="date"
                      className="w-auto"
                      value={newShare.expires_at}
                      onChange={(e) => setNewShare((prev) => ({ ...prev, expires_at: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={handleAddShare}>
                    Create Share
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════ HISTORY ══════════════════ */}
        <TabsContent value="history" className="mt-0 flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Version History</CardTitle>
              </div>
              <CardDescription>ประวัติไฟล์และคิวรี่ทุกเวอร์ชัน — กด Rollback เพื่อย้อนกลับไปเวอร์ชันเก่า</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fileKinds.map(({ kind, label }) => {
                const rows = history.files[kind] ?? [];
                if (rows.length === 0) return null;
                return (
                  <div key={kind} className="space-y-2">
                    <FieldLabel>{label}</FieldLabel>
                    <div className="space-y-1">
                      {rows.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{r.file_name} (v{r.version})</span>
                            {r.is_current && (
                              <span className="text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">ปัจจุบัน</span>
                            )}
                          </div>
                          {!r.is_current && (
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleRollbackFile(r)}>
                              Rollback
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {history.queries.map((q) => (
                <div key={q.id} className="space-y-2">
                  <FieldLabel>{q.name} (คิวรี่)</FieldLabel>
                  {q.report_query_versions.length === 0 ? (
                    <FieldDescription>ยังไม่มีประวัติการแก้ไข</FieldDescription>
                  ) : (
                    <div className="space-y-1">
                      {q.report_query_versions.map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-2">
                          <div className="min-w-0">
                            <span>v{v.version}</span>
                            {v.change_log && <span className="text-muted-foreground truncate"> — {v.change_log}</span>}
                          </div>
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleRollbackQuery(v)}>
                            Rollback
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ContentLayout>
  );
}

// ─── Shared query edit form (used by both Main Query and Sub Queries) ───────
function QueryEditForm({
  draft,
  setDraft,
  onCancel,
  onSave,
}: {
  draft: { name: string; sql_text: string; is_main: boolean; change_log: string };
  setDraft: React.Dispatch<React.SetStateAction<{ name: string; sql_text: string; is_main: boolean; change_log: string }>>;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        value={draft.name}
        onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="Query name"
      />
      <Textarea
        className="resize-none min-h-[80px] font-mono text-xs"
        value={draft.sql_text}
        onChange={(e) => setDraft((prev) => ({ ...prev, sql_text: e.target.value }))}
        placeholder="SQL text"
      />
      <Input
        value={draft.change_log}
        onChange={(e) => setDraft((prev) => ({ ...prev, change_log: e.target.value }))}
        placeholder="Change log (optional, saved with the version snapshot)"
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id="q-draft-main"
          checked={draft.is_main}
          onCheckedChange={(v) => setDraft((prev) => ({ ...prev, is_main: v === true }))}
        />
        <FieldLabel htmlFor="q-draft-main" className="font-normal">Main query</FieldLabel>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave}>
          Save
        </Button>
      </div>
    </div>
  );
}
