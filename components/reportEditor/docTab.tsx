"use client";

import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FileUpload, { AllowedFileType } from "@/components/shared/fileuploading";
import { FILE_PURPOSE_ORDER, FILE_PURPOSE_LABEL, getFilePurposeDescription, isMultiFilePurpose, type FilePurpose } from "@/lib/file-purpose";
import { FolderOpen, Share2, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

type SelectOption = { id: string; name: string };

interface ReportFileRow {
  id: string;
  file_kind: FilePurpose;
  file_path: string;
  file_name: string;
  version: string;
}

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

const ACCEPT_BY_PURPOSE: Record<FilePurpose, AllowedFileType> = {
  BLANK_FORM: "pdf",
  SAMPLE_FILLED_FORM: "pdf",
  SAMPLE_DATA: "excel",
  REFERENCE_DOC: "all",
};

export function DocTab({ reportId }: { reportId: string }) {
  const td = useTranslations("reportEditor.docTab");
  const tfp = useTranslations("reports.filePurpose");
  const tc = useTranslations("common");
  const [currentFiles, setCurrentFiles] = React.useState<ReportFileRow[]>([]);
  const [shares, setShares] = React.useState<ReportShareRow[]>([]);
  const [userOptions, setUserOptions] = React.useState<SelectOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<SelectOption[]>([]);
  const [newShare, setNewShare] = React.useState(EMPTY_NEW_SHARE);
  const [uploadPurpose, setUploadPurpose] = React.useState<FilePurpose>("BLANK_FORM");
  const [pendingUpload, setPendingUpload] = React.useState<File[]>([]);

  const fetchAll = useCallback(async () => {
    const [filesRes, sharesRes, usersRes, deptRes] = await Promise.all([
      fetch(`/api/reports/${reportId}/files`, { credentials: "include" }),
      fetch(`/api/reports/${reportId}/shares`, { credentials: "include" }),
      fetch("/api/users/user", { credentials: "include" }),
      fetch("/api/users/departments", { credentials: "include" }),
    ]);
    if (filesRes.ok) {
      const json = await filesRes.json();
      if (json?.success) setCurrentFiles(json.data);
    }
    if (sharesRes.ok) {
      const json = await sharesRes.json();
      if (json?.success) setShares(json.data);
    }
    if (usersRes.ok) {
      const json = await usersRes.json();
      if (json?.success) {
        setUserOptions(
          json.data.map((u: { id: string; first_name: string; last_name: string; username: string }) => ({
            id: u.id,
            name: `${u.first_name} ${u.last_name}`.trim() || u.username,
          }))
        );
      }
    }
    if (deptRes.ok) {
      const json = await deptRes.json();
      if (Array.isArray(json?.data)) {
        setDepartmentOptions(json.data.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
      }
    }
  }, [reportId]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUpload = async () => {
    if (pendingUpload.length === 0) {
      toast.error(td("errors.selectFileFirst"));
      return;
    }
    const filesToUpload = isMultiFilePurpose(uploadPurpose) ? pendingUpload : [pendingUpload[0]];
    let failed = 0;
    for (const file of filesToUpload) {
      const form = new FormData();
      form.append("file", file);
      form.append("file_kind", uploadPurpose);
      const res = await fetch(`/api/reports/${reportId}/files`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) failed += 1;
    }
    if (failed > 0) {
      toast.error(td("errors.uploadFailedCount", { count: failed }));
    } else {
      toast.success(td("success.upload"));
    }
    setPendingUpload([]);
    fetchAll();
  };

  const handleDeleteFile = async (fileId: string) => {
    const res = await fetch(`/api/reports/${reportId}/files?id=${fileId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error(td("errors.deleteFileFailed"));
      return;
    }
    toast.success(td("success.deleteFile"));
    fetchAll();
  };

  const handleAddShare = async () => {
    if (newShare.share_type !== "LINK" && !newShare.shared_with) {
      toast.error(newShare.share_type === "USER" ? td("errors.chooseUser") : td("errors.chooseDepartment"));
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
      toast.error(body?.error ?? td("errors.createShareFailed"));
      return;
    }
    toast.success(td("success.createShare"));
    setNewShare(EMPTY_NEW_SHARE);
    fetchAll();
  };

  const handleRevokeShare = async (row: ReportShareRow) => {
    const res = await fetch(`/api/reports/${reportId}/shares?id=${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error(td("errors.revokeShareFailed"));
      return;
    }
    toast.success(td("success.revokeShare"));
    fetchAll();
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/shares/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(td("success.copyLink"));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{td("documentsTitle")}</CardTitle>
          </div>
          <CardDescription>
            {td("documentsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 border rounded-md p-3 bg-muted/30">
            <FieldLabel>{td("documentTypeLabel")}</FieldLabel>
            <Select value={uploadPurpose} onValueChange={(v) => { setUploadPurpose(v as FilePurpose); setPendingUpload([]); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FILE_PURPOSE_ORDER.map((purpose) => (
                    <SelectItem key={purpose} value={purpose}>
                      {FILE_PURPOSE_LABEL[purpose]} — {getFilePurposeDescription(tfp, purpose)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FileUpload
              accept={ACCEPT_BY_PURPOSE[uploadPurpose]}
              multiple={isMultiFilePurpose(uploadPurpose)}
              onFilesChange={setPendingUpload}
              fileOutside={pendingUpload}
            />
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" disabled={pendingUpload.length === 0} onClick={handleUpload}>
                {td("uploadButton")}
              </Button>
            </div>
          </div>

          {FILE_PURPOSE_ORDER.map((purpose) => {
            const rows = currentFiles.filter((f) => f.file_kind === purpose);
            const isMulti = isMultiFilePurpose(purpose);
            return (
              <div key={purpose} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {FILE_PURPOSE_LABEL[purpose]}
                  {!isMulti && rows.length > 0 && (
                    <span className="ml-2 normal-case rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]">{td("activeFileBadge")}</span>
                  )}
                </p>
                {rows.length === 0 ? (
                  <FieldDescription>{td("noDocumentsOfType")}</FieldDescription>
                ) : (
                  <div className="space-y-1">
                    {rows.map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-2">
                        <span className="truncate">{f.file_name} (v{f.version})</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteFile(f.id)}>
                          {tc("delete")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{td("sharingTitle")}</CardTitle>
          </div>
          <CardDescription>{td("sharingDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shares.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs rounded bg-muted px-1.5 py-0.5">
                    {td(`shareTypeLabel.${s.share_type}`)}
                  </span>
                  {s.can_download && <span className="text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">{td("canDownloadBadge")}</span>}
                  {s.can_edit && <span className="text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">{td("canEditBadge")}</span>}
                  {s.expires_at && (
                    <span className="text-xs text-muted-foreground">
                      {td("expiresLabel", { date: new Date(s.expires_at).toLocaleDateString("th-TH") })}
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
                {td("revoke")}
              </Button>
            </div>
          ))}

          <div className="border-t pt-4 space-y-3">
            <FieldLabel>{td("createNewShare")}</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={newShare.share_type}
                onValueChange={(v) => setNewShare((prev) => ({ ...prev, share_type: v as ReportShareRow["share_type"], shared_with: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={td("shareTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="LINK">{td("shareTypeOptions.LINK")}</SelectItem>
                    <SelectItem value="USER">{td("shareTypeOptions.USER")}</SelectItem>
                    <SelectItem value="DEPARTMENT">{td("shareTypeOptions.DEPARTMENT")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {newShare.share_type !== "LINK" && (
                <Select
                  value={newShare.shared_with}
                  onValueChange={(v) => setNewShare((prev) => ({ ...prev, shared_with: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={newShare.share_type === "USER" ? td("selectUserPlaceholder") : td("selectDepartmentPlaceholder")} />
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
                <FieldLabel htmlFor="new-share-download" className="font-normal">{td("canDownloadLabel")}</FieldLabel>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="new-share-edit"
                  checked={newShare.can_edit}
                  onCheckedChange={(c) => setNewShare((prev) => ({ ...prev, can_edit: c === true }))}
                />
                <FieldLabel htmlFor="new-share-edit" className="font-normal">{td("canEditLabel")}</FieldLabel>
              </div>
              <div className="flex items-center gap-2">
                <FieldLabel htmlFor="new-share-expires" className="font-normal">{td("expiresDateLabel")}</FieldLabel>
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
                {td("createShareButton")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
