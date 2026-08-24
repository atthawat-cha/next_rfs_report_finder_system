"use client";

import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import FileUpload from "@/components/shared/fileuploading";
import { GitBranch } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

type SelectOption = { id: string; name: string };
export type SubReportSlot = "HEADER" | "DETAIL" | "FOOTER";
export type SubReportSourceType = "UPLOAD" | "LINKED_REPORT";

export interface SubReportRow {
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

const EMPTY_NEW_SUB_REPORT = {
  name: "",
  slot: "DETAIL" as SubReportSlot,
  source_type: "UPLOAD" as SubReportSourceType,
  linked_report_id: "",
};

export function SubTab({ reportId, onDataChange }: { reportId: string; onDataChange?: () => void }) {
  const ts = useTranslations("reportEditor.subTab");
  const tc = useTranslations("common");
  const SLOT_LABEL: Record<SubReportSlot, string> = {
    HEADER: ts("slot.HEADER"),
    DETAIL: ts("slot.DETAIL"),
    FOOTER: ts("slot.FOOTER"),
  };
  const [subReports, setSubReports] = React.useState<SubReportRow[]>([]);
  const [reportOptions, setReportOptions] = React.useState<SelectOption[]>([]);
  const [newSubReport, setNewSubReport] = React.useState(EMPTY_NEW_SUB_REPORT);
  const [newSubReportFile, setNewSubReportFile] = React.useState<File[]>([]);
  const [editingSubReportId, setEditingSubReportId] = React.useState<string | null>(null);
  const [subReportDraft, setSubReportDraft] = React.useState({ name: "", slot: "DETAIL" as SubReportSlot });

  const fetchAll = useCallback(async () => {
    const [subReportsRes, reportsRes] = await Promise.all([
      fetch(`/api/reports/${reportId}/sub-reports`, { credentials: "include" }),
      fetch("/api/reports/report/manage?pageSize=200", { credentials: "include" }),
    ]);
    if (subReportsRes.ok) {
      const json = await subReportsRes.json();
      if (json?.success) setSubReports(json.data);
    }
    if (reportsRes.ok) {
      const json = await reportsRes.json();
      if (json?.success) {
        setReportOptions(
          json.data
            .filter((r: { id: string }) => r.id !== reportId)
            .map((r: { id: string; code: string; name_th: string }) => ({ id: r.id, name: `${r.code} — ${r.name_th}` }))
        );
      }
    }
    onDataChange?.();
  }, [reportId, onDataChange]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAddSubReport = async () => {
    if (!newSubReport.name.trim()) {
      toast.error(ts("errors.missingName"));
      return;
    }
    if (newSubReport.source_type === "UPLOAD" && newSubReportFile.length === 0) {
      toast.error(ts("errors.missingFile"));
      return;
    }
    if (newSubReport.source_type === "LINKED_REPORT" && !newSubReport.linked_report_id) {
      toast.error(ts("errors.missingLinkedReport"));
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
      toast.error(body?.error ?? ts("errors.addFailed"));
      return;
    }
    toast.success(ts("success.add"));
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
      toast.error(body?.error ?? ts("errors.saveFailed"));
      return;
    }
    toast.success(ts("success.save"));
    setEditingSubReportId(null);
    fetchAll();
  };

  const handleDeleteSubReport = async (row: SubReportRow) => {
    const res = await fetch(`/api/reports/${reportId}/sub-reports?id=${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error(ts("errors.deleteFailed"));
      return;
    }
    toast.success(ts("success.delete"));
    fetchAll();
  };

  const subReportsBySlot = SLOT_OPTIONS.map((slot) => ({
    slot,
    rows: subReports.filter((s) => s.slot === slot),
  }));

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">{ts("title")}</CardTitle>
        </div>
        <CardDescription>
          {ts("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {subReportsBySlot.map(({ slot, rows }) => (
          <div key={slot} className="space-y-2">
            <FieldLabel>{SLOT_LABEL[slot]}</FieldLabel>
            {rows.length === 0 ? (
              <FieldDescription>{ts("noSubReportsInSlot")}</FieldDescription>
            ) : (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className="border rounded-md p-3">
                    {editingSubReportId === row.id ? (
                      <div className="space-y-2">
                        <Input
                          value={subReportDraft.name}
                          onChange={(e) => setSubReportDraft((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder={ts("namePlaceholder")}
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
                            {tc("cancel")}
                          </Button>
                          <Button type="button" size="sm" onClick={handleSaveSubReport}>
                            {tc("save")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{row.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {row.source_type === "UPLOAD"
                              ? ts("uploadedFile", { fileName: row.file_name ?? "" })
                              : ts("linkedReport", { report: row.linked_report?.code ?? row.linked_report_id ?? "" })}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-none">
                          <Button type="button" size="sm" variant="ghost" onClick={() => startEditSubReport(row)}>
                            {tc("edit")}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteSubReport(row)}>
                            {tc("delete")}
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
          <FieldLabel>{ts("addNewSubReport")}</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={newSubReport.name}
              onChange={(e) => setNewSubReport((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={ts("namePlaceholder")}
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
                <SelectItem value="UPLOAD">{ts("sourceType.upload")}</SelectItem>
                <SelectItem value="LINKED_REPORT">{ts("sourceType.linked")}</SelectItem>
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
                <SelectValue placeholder={ts("selectLinkedReportPlaceholder")} />
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
              {ts("addButton")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { SLOT_OPTIONS };
