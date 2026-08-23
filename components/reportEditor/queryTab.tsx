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
import { Textarea } from "@/components/ui/textarea";
import { QuerySummary } from "@/components/shared/querySummary";
import { Database } from "lucide-react";
import toast from "react-hot-toast";

interface ReportQueryRow {
  id: string;
  sub_report_id: string | null;
  name: string;
  sql_text: string;
  is_main: boolean;
  version: string;
}

interface SubReportOption {
  id: string;
  name: string;
}

type QueryDraft = { name: string; sql_text: string; is_main: boolean; change_log: string };

const MAIN_SCOPE = "__main__";
const EMPTY_NEW_QUERY = { name: "", sql_text: "", is_main: false, sub_report_id: MAIN_SCOPE };

function QueryEditForm({
  draft,
  setDraft,
  onCancel,
  onSave,
}: {
  draft: QueryDraft;
  setDraft: React.Dispatch<React.SetStateAction<QueryDraft>>;
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

export function QueryTab({ reportId }: { reportId: string }) {
  const [queries, setQueries] = React.useState<ReportQueryRow[]>([]);
  const [subReports, setSubReports] = React.useState<SubReportOption[]>([]);
  const [newQuery, setNewQuery] = React.useState(EMPTY_NEW_QUERY);
  const [editingQueryId, setEditingQueryId] = React.useState<string | null>(null);
  const [queryDraft, setQueryDraft] = React.useState<QueryDraft>({ name: "", sql_text: "", is_main: false, change_log: "" });

  const fetchAll = useCallback(async () => {
    const [queriesRes, subReportsRes] = await Promise.all([
      fetch(`/api/reports/${reportId}/queries`, { credentials: "include" }),
      fetch(`/api/reports/${reportId}/sub-reports`, { credentials: "include" }),
    ]);
    if (queriesRes.ok) {
      const json = await queriesRes.json();
      if (json?.success) setQueries(json.data);
    }
    if (subReportsRes.ok) {
      const json = await subReportsRes.json();
      if (json?.success) setSubReports(json.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
    }
  }, [reportId]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAddQuery = async () => {
    if (!newQuery.name.trim() || !newQuery.sql_text.trim()) {
      toast.error("Name and SQL text are required");
      return;
    }
    const res = await fetch(`/api/reports/${reportId}/queries`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newQuery.name,
        sql_text: newQuery.sql_text,
        is_main: newQuery.is_main,
        sub_report_id: newQuery.sub_report_id === MAIN_SCOPE ? null : newQuery.sub_report_id,
      }),
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

  const containers = [
    { key: null as string | null, title: "รายงานหลัก" },
    ...subReports.map((sr) => ({ key: sr.id, title: `Sub-report: ${sr.name}` })),
  ];

  return (
    <div className="space-y-4">
      {containers.map((container) => {
        const containerQueries = queries.filter((q) => (q.sub_report_id ?? null) === container.key);
        const mainQuery = containerQueries.find((q) => q.is_main) ?? null;
        const subQueries = containerQueries.filter((q) => !q.is_main);

        return (
          <Card key={container.key ?? "main"}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{container.title}</CardTitle>
              </div>
              <CardDescription>
                Reference/documentation only — the app never executes these queries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Main Query</p>
                {mainQuery ? (
                  <div className="border rounded-md p-3 space-y-2">
                    {editingQueryId === mainQuery.id ? (
                      <QueryEditForm draft={queryDraft} setDraft={setQueryDraft} onCancel={() => setEditingQueryId(null)} onSave={handleSaveQuery} />
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{mainQuery.name}</span>
                            <span className="text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">Main</span>
                            <span className="text-xs text-muted-foreground">v{mainQuery.version}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="ghost" onClick={() => startEditQuery(mainQuery)}>Edit</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteQuery(mainQuery)}>Delete</Button>
                          </div>
                        </div>
                        <QuerySummary sql={mainQuery.sql_text} maxHeight="16rem" />
                      </>
                    )}
                  </div>
                ) : (
                  <FieldDescription>ยังไม่มี main query ในขอบเขตนี้</FieldDescription>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sub Queries</p>
                {subQueries.length === 0 && <FieldDescription>ยังไม่มี sub query</FieldDescription>}
                <div className="space-y-2">
                  {subQueries.map((q) => (
                    <div key={q.id} className="border rounded-md p-3 space-y-2">
                      {editingQueryId === q.id ? (
                        <QueryEditForm draft={queryDraft} setDraft={setQueryDraft} onCancel={() => setEditingQueryId(null)} onSave={handleSaveQuery} />
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{q.name}</span>
                              <span className="text-xs text-muted-foreground">v{q.version}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" variant="ghost" onClick={() => handleSetMainQuery(q)}>Set as main</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => startEditQuery(q)}>Edit</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteQuery(q)}>Delete</Button>
                            </div>
                          </div>
                          <QuerySummary sql={q.sql_text} maxHeight="16rem" />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Add query</CardTitle>
          <CardDescription>เลือกขอบเขต (รายงานหลัก หรือ sub-report) แล้วติ๊ก &quot;Main query&quot; ถ้าต้องการให้เป็นคิวรี่หลักของขอบเขตนั้น</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select
            value={newQuery.sub_report_id}
            onValueChange={(v) => setNewQuery((prev) => ({ ...prev, sub_report_id: v }))}
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
        </CardContent>
      </Card>
    </div>
  );
}
