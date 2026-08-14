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
import { Loader2, FileText, Layers, Database, Variable as VariableIcon, Shield, History, Share2, Copy } from "lucide-react";
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

interface ReportFileRow {
  id: string;
  file_kind: "BLANK_FORM" | "SAMPLE_FILLED_FORM" | "SAMPLE_DATA";
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

interface PermissionFlags {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_favorite: boolean;
  can_export: boolean;
  can_print: boolean;
}

interface ReportPermissionRow extends PermissionFlags {
  id: string;
  subject_type: "USER" | "ROLE";
  subject_id: string;
  subject_name: string;
}

const EMPTY_FLAGS: PermissionFlags = {
  can_view: false,
  can_edit: false,
  can_delete: false,
  can_favorite: false,
  can_export: false,
  can_print: false,
};

const PERMISSION_ACTIONS: { key: keyof PermissionFlags; label: string }[] = [
  { key: "can_view", label: "View" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
  { key: "can_favorite", label: "Favorite" },
  { key: "can_export", label: "Export" },
  { key: "can_print", label: "Print" },
];

interface HistoryFileRow {
  id: string;
  file_kind: ReportFileRow["file_kind"];
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

const FILE_KINDS_BY_OUTPUT_TYPE: Record<string, { kind: ReportFileRow["file_kind"]; label: string; accept: AllowedFileType }[]> = {
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
  const [queries, setQueries] = React.useState<ReportQueryRow[]>([]);
  const [newQuery, setNewQuery] = React.useState(EMPTY_NEW_QUERY);
  const [editingQueryId, setEditingQueryId] = React.useState<string | null>(null);
  const [queryDraft, setQueryDraft] = React.useState({ name: "", sql_text: "", is_main: false, change_log: "" });
  const [variables, setVariables] = React.useState<ReportVariableRow[]>([]);
  const [newVariable, setNewVariable] = React.useState(EMPTY_NEW_VARIABLE);
  const [editingVariableId, setEditingVariableId] = React.useState<string | null>(null);
  const [variableDraft, setVariableDraft] = React.useState(EMPTY_NEW_VARIABLE);
  const [permissions, setPermissions] = React.useState<ReportPermissionRow[]>([]);
  const [userOptions, setUserOptions] = React.useState<SelectOption[]>([]);
  const [roleOptions, setRoleOptions] = React.useState<SelectOption[]>([]);
  const [newGrant, setNewGrant] = React.useState<{ subject_type: "USER" | "ROLE"; subject_id: string } & PermissionFlags>({
    subject_type: "USER",
    subject_id: "",
    ...EMPTY_FLAGS,
  });
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
      const [reportRes, baseRes, queriesRes, variablesRes, permissionsRes, usersRes, rolesRes, historyRes, sharesRes, deptRes] = await Promise.all([
        fetch(`/api/reports/report/manage/${reportId}`, { credentials: "include" }),
        fetch("/api/baseconfig/selections", { credentials: "include" }),
        fetch(`/api/reports/${reportId}/queries`, { credentials: "include" }),
        fetch(`/api/reports/${reportId}/variables`, { credentials: "include" }),
        fetch(`/api/reports/${reportId}/permissions`, { credentials: "include" }),
        fetch("/api/users/user", { credentials: "include" }),
        fetch("/api/users/roles", { credentials: "include" }),
        fetch(`/api/reports/${reportId}/versions`, { credentials: "include" }),
        fetch(`/api/reports/${reportId}/shares`, { credentials: "include" }),
        fetch("/api/users/departments", { credentials: "include" }),
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

      if (permissionsRes.ok) {
        const permissionsJson = await permissionsRes.json();
        if (permissionsJson?.success) setPermissions(permissionsJson.data);
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

      if (rolesRes.ok) {
        const rolesJson = await rolesRes.json();
        if (Array.isArray(rolesJson)) {
          setRoleOptions(
            rolesJson.map((r: { id: string; display_name: string; name: string }) => ({
              id: r.id,
              name: r.display_name || r.name,
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
        if (Array.isArray(deptJson)) {
          setDepartmentOptions(deptJson.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
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

  const handleAddGrant = async () => {
    if (!newGrant.subject_id) {
      toast.error("Please choose a user or role");
      return;
    }
    const res = await fetch(`/api/reports/${reportId}/permissions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGrant),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to add permission grant");
      return;
    }
    toast.success("Permission grant added");
    setNewGrant({ subject_type: "USER", subject_id: "", ...EMPTY_FLAGS });
    fetchAll();
  };

  const handleTogglePermissionFlag = (rowId: string, key: keyof PermissionFlags, checked: boolean) => {
    setPermissions((prev) => prev.map((p) => (p.id === rowId ? { ...p, [key]: checked } : p)));
  };

  const handleSavePermission = async (row: ReportPermissionRow) => {
    const res = await fetch(`/api/reports/${reportId}/permissions`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        can_view: row.can_view,
        can_edit: row.can_edit,
        can_delete: row.can_delete,
        can_favorite: row.can_favorite,
        can_export: row.can_export,
        can_print: row.can_print,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to save permission grant");
      return;
    }
    toast.success("Permission grant saved");
    fetchAll();
  };

  const handleDeleteGrant = async (row: ReportPermissionRow) => {
    const res = await fetch(`/api/reports/${reportId}/permissions?id=${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Failed to delete permission grant");
      return;
    }
    toast.success("Permission grant deleted");
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

  return (
    <ContentLayout title="Report Edit">
      <DefaultBreadcrumb />
      <Separator className="my-5" />

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Edit Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Output type: <span className="font-medium">{outputType}</span> (กำหนดตอนสร้าง แก้ไม่ได้)
        </p>
      </div>

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
                <CardTitle className="text-base">Files</CardTitle>
              </div>
              <CardDescription>
                จัดการไฟล์ตาม output_type — อัปโหลดไฟล์ใหม่จะแทนที่ไฟล์เดิม (เก็บเวอร์ชันเก่าไว้)
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
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Queries</CardTitle>
            </div>
            <CardDescription>
              Reference/documentation only — the app never executes these queries. หนึ่งรายงานมี main query ได้ 1 อัน
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {queries.map((q) => (
              <div key={q.id} className="border rounded-md p-3 space-y-2">
                {editingQueryId === q.id ? (
                  <div className="space-y-2">
                    <Input
                      value={queryDraft.name}
                      onChange={(e) => setQueryDraft((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Query name"
                    />
                    <Textarea
                      className="resize-none min-h-[80px] font-mono text-xs"
                      value={queryDraft.sql_text}
                      onChange={(e) => setQueryDraft((prev) => ({ ...prev, sql_text: e.target.value }))}
                      placeholder="SQL text"
                    />
                    <Input
                      value={queryDraft.change_log}
                      onChange={(e) => setQueryDraft((prev) => ({ ...prev, change_log: e.target.value }))}
                      placeholder="Change log (optional, saved with the version snapshot)"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`q-main-${q.id}`}
                        checked={queryDraft.is_main}
                        onCheckedChange={(v) => setQueryDraft((prev) => ({ ...prev, is_main: v === true }))}
                      />
                      <FieldLabel htmlFor={`q-main-${q.id}`} className="font-normal">Main query</FieldLabel>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingQueryId(null)}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={handleSaveQuery}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{q.name}</span>
                        {q.is_main && (
                          <span className="text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">Main</span>
                        )}
                        <span className="text-xs text-muted-foreground">v{q.version}</span>
                      </div>
                      <div className="flex gap-2">
                        {!q.is_main && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleSetMainQuery(q)}>
                            Set as main
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="ghost" onClick={() => startEditQuery(q)}>
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteQuery(q)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap">{q.sql_text}</pre>
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

        <Card className="mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <VariableIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Variables</CardTitle>
            </div>
            <CardDescription>ตัวแปรอ้างอิงของรายงาน (ข้อมูลอ้างอิงเท่านั้น)</CardDescription>
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

        <Card className="mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Permissions</CardTitle>
            </div>
            <CardDescription>
              สิทธิ์ต่อผู้ใช้/บทบาทสำหรับรายงานนี้ — ถ้าไม่มี grant ระบบจะ fallback ไปใช้ Access Level ด้านบน
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {permissions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-2">Subject</th>
                      {PERMISSION_ACTIONS.map((a) => (
                        <th key={a.key} className="pb-2 px-2 text-center">{a.label}</th>
                      ))}
                      <th className="pb-2 pl-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-2 pr-2 whitespace-nowrap">
                          <span className="font-medium">{p.subject_name}</span>{" "}
                          <span className="text-xs text-muted-foreground">
                            ({p.subject_type === "USER" ? "User" : "Role"})
                          </span>
                        </td>
                        {PERMISSION_ACTIONS.map((a) => (
                          <td key={a.key} className="text-center px-2">
                            <Checkbox
                              checked={p[a.key]}
                              onCheckedChange={(c) => handleTogglePermissionFlag(p.id, a.key, c === true)}
                            />
                          </td>
                        ))}
                        <td className="py-2 pl-2 whitespace-nowrap text-right">
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleSavePermission(p)}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteGrant(p)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <FieldLabel>เพิ่มสิทธิ์</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={newGrant.subject_type}
                  onValueChange={(v) => setNewGrant((prev) => ({ ...prev, subject_type: v as "USER" | "ROLE", subject_id: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Subject type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="ROLE">Role</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select
                  value={newGrant.subject_id}
                  onValueChange={(v) => setNewGrant((prev) => ({ ...prev, subject_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={newGrant.subject_type === "USER" ? "Select user" : "Select role"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(newGrant.subject_type === "USER" ? userOptions : roleOptions).map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {PERMISSION_ACTIONS.map((a) => (
                  <div key={a.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`new-grant-${a.key}`}
                      checked={newGrant[a.key]}
                      onCheckedChange={(c) => setNewGrant((prev) => ({ ...prev, [a.key]: c === true }))}
                    />
                    <FieldLabel htmlFor={`new-grant-${a.key}`} className="font-normal">{a.label}</FieldLabel>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="outline" onClick={handleAddGrant}>
                  Add Permission Grant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
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

        <Card className="mt-6">
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
    </ContentLayout>
  );
}
