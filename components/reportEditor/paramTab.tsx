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
import { Variable as VariableIcon } from "lucide-react";
import toast from "react-hot-toast";

interface ReportVariableRow {
  id: string;
  sub_report_id: string | null;
  name: string;
  label: string | null;
  data_type: "STRING" | "NUMBER" | "DATE" | "BOOLEAN";
  default_value: string | null;
  is_required: boolean;
  sort_order: number;
}

interface SubReportOption {
  id: string;
  name: string;
}

const DATA_TYPES: ReportVariableRow["data_type"][] = ["STRING", "NUMBER", "DATE", "BOOLEAN"];
const MAIN_SCOPE = "__main__";

const EMPTY_NEW_VARIABLE = {
  name: "",
  label: "",
  data_type: "STRING" as ReportVariableRow["data_type"],
  default_value: "",
  is_required: false,
  sort_order: 0,
  sub_report_id: MAIN_SCOPE,
};

export function ParamTab({ reportId }: { reportId: string }) {
  const [variables, setVariables] = React.useState<ReportVariableRow[]>([]);
  const [subReports, setSubReports] = React.useState<SubReportOption[]>([]);
  const [newVariable, setNewVariable] = React.useState(EMPTY_NEW_VARIABLE);
  const [editingVariableId, setEditingVariableId] = React.useState<string | null>(null);
  const [variableDraft, setVariableDraft] = React.useState(EMPTY_NEW_VARIABLE);

  const fetchAll = useCallback(async () => {
    const [variablesRes, subReportsRes] = await Promise.all([
      fetch(`/api/reports/${reportId}/variables`, { credentials: "include" }),
      fetch(`/api/reports/${reportId}/sub-reports`, { credentials: "include" }),
    ]);
    if (variablesRes.ok) {
      const json = await variablesRes.json();
      if (json?.success) setVariables(json.data);
    }
    if (subReportsRes.ok) {
      const json = await subReportsRes.json();
      if (json?.success) setSubReports(json.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
    }
  }, [reportId]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAddVariable = async () => {
    if (!newVariable.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const res = await fetch(`/api/reports/${reportId}/variables`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newVariable,
        sub_report_id: newVariable.sub_report_id === MAIN_SCOPE ? null : newVariable.sub_report_id,
      }),
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
      sub_report_id: row.sub_report_id ?? MAIN_SCOPE,
    });
  };

  const handleSaveVariable = async () => {
    if (!editingVariableId) return;
    const res = await fetch(`/api/reports/${reportId}/variables`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingVariableId,
        ...variableDraft,
        sub_report_id: variableDraft.sub_report_id === MAIN_SCOPE ? null : variableDraft.sub_report_id,
      }),
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

  const groups = [
    { key: MAIN_SCOPE as string | null, title: "พารามิเตอร์ของรายงานหลัก", rows: variables.filter((v) => !v.sub_report_id) },
    ...subReports.map((sr) => ({
      key: sr.id,
      title: `พารามิเตอร์ของ Sub-report: ${sr.name}`,
      rows: variables.filter((v) => v.sub_report_id === sr.id),
    })),
  ];

  const renderVariableRow = (v: ReportVariableRow) => (
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
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <VariableIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Parameters</CardTitle>
        </div>
        <CardDescription>ตัวแปรที่ใช้ในรายงานนี้ — ระบุได้ว่าใช้กับรายงานหลัก หรือ sub-report ตัวไหน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {group.title} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] normal-case">{group.rows.length}</span>
            </p>
            {group.rows.length === 0 ? (
              <FieldDescription>ยังไม่มีพารามิเตอร์ในขอบเขตนี้</FieldDescription>
            ) : (
              <div className="space-y-2">{group.rows.map(renderVariableRow)}</div>
            )}
          </div>
        ))}

        <div className="border-t pt-4 space-y-2">
          <FieldLabel>เพิ่มพารามิเตอร์ใหม่</FieldLabel>
          <Select
            value={newVariable.sub_report_id}
            onValueChange={(v) => setNewVariable((prev) => ({ ...prev, sub_report_id: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={MAIN_SCOPE}>รายงานหลัก</SelectItem>
                {subReports.map((sr) => (
                  <SelectItem key={sr.id} value={sr.id}>Sub-report: {sr.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
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
                Add Parameter
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
