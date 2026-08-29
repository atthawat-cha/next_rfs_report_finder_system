"use client";

import React, { useCallback } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Database, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SqlEditor, type SqlEditorHandle } from "@/components/shared/sqlEditor";
import { analyzeSql } from "@/lib/sql-analyze";
import { cn } from "@/lib/utils";

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

interface ReportVariableRow {
  id: string;
  sub_report_id: string | null;
  name: string;
  data_type: string;
}

interface QueryVersionRow {
  version: string;
  change_log: string | null;
}

const MAIN_SCOPE = "__main__";
const EMPTY_DRAFT = { name: "", sql_text: "", sub_report_id: MAIN_SCOPE, is_main: false, change_log: "" };

const FORMAT_CLAUSES = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING",
  "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "JOIN", "AND", "OR", "LIMIT",
];

function formatSql(sql: string): string {
  let out = sql.replace(/\s+/g, " ").trim();
  for (const clause of FORMAT_CLAUSES) {
    const re = new RegExp("\\s+(" + clause.replace(" ", "\\s+") + ")\\b", "gi");
    out = out.replace(re, "\n$1");
  }
  return out;
}

function containerKeyOf(subReportId: string | null): string {
  return subReportId ?? MAIN_SCOPE;
}

function AnalysisChips({ label, items, className }: { label: string; items: string[]; className: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-16 flex-none pt-0.5 font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-muted-foreground/70">—</span>
        ) : (
          items.map((item, i) => (
            <span key={i} className={cn("rounded px-1.5 py-0.5 font-mono text-[11px]", className)}>{item}</span>
          ))
        )}
      </div>
    </div>
  );
}

export function QueryTab({ reportId, onDataChange }: { reportId: string; onDataChange?: () => void }) {
  const tq = useTranslations("reportEditor.queryTab");
  const tc = useTranslations("common");

  const [queries, setQueries] = React.useState<ReportQueryRow[]>([]);
  const [subReports, setSubReports] = React.useState<SubReportOption[]>([]);
  const [variables, setVariables] = React.useState<ReportVariableRow[]>([]);
  const [versionsByQuery, setVersionsByQuery] = React.useState<Record<string, QueryVersionRow[]>>({});
  const [loaded, setLoaded] = React.useState(false);

  const [mode, setMode] = React.useState<"edit" | "new">("edit");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState(EMPTY_DRAFT);
  const [editorTheme, setEditorTheme] = React.useState<"dark" | "light">("dark");
  const [paramsOpen, setParamsOpen] = React.useState(false);
  const sqlEditorRef = React.useRef<SqlEditorHandle>(null);

  const fetchAll = useCallback(async () => {
    const [queriesRes, subReportsRes, variablesRes, versionsRes] = await Promise.all([
      fetch(`/api/reports/${reportId}/queries`, { credentials: "include" }),
      fetch(`/api/reports/${reportId}/sub-reports`, { credentials: "include" }),
      fetch(`/api/reports/${reportId}/variables`, { credentials: "include" }),
      fetch(`/api/reports/${reportId}/versions`, { credentials: "include" }),
    ]);
    if (queriesRes.ok) {
      const json = await queriesRes.json();
      if (json?.success) setQueries(json.data);
    }
    if (subReportsRes.ok) {
      const json = await subReportsRes.json();
      if (json?.success) setSubReports(json.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
    }
    if (variablesRes.ok) {
      const json = await variablesRes.json();
      if (json?.success) setVariables(json.data);
    }
    if (versionsRes.ok) {
      const json = await versionsRes.json();
      if (json?.success) {
        const map: Record<string, QueryVersionRow[]> = {};
        for (const q of json.data.queries as { id: string; report_query_versions: QueryVersionRow[] }[]) {
          map[q.id] = q.report_query_versions;
        }
        setVersionsByQuery(map);
      }
    }
    setLoaded(true);
    onDataChange?.();
  }, [reportId, onDataChange]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Keep the selection valid as the list changes; default to the first query
  // once data has loaded, or drop into "new query" mode if there are none yet.
  React.useEffect(() => {
    if (!loaded || mode !== "edit") return;
    if (selectedId && queries.some((q) => q.id === selectedId)) return;
    if (queries.length === 0) {
      setMode("new");
      setDraft(EMPTY_DRAFT);
      return;
    }
    setSelectedId(queries[0].id);
  }, [loaded, queries, mode, selectedId]);

  // Load the selected query's data into the draft whenever the selection changes.
  React.useEffect(() => {
    if (mode !== "edit" || !selectedId) return;
    const q = queries.find((x) => x.id === selectedId);
    if (!q) return;
    setDraft({
      name: q.name,
      sql_text: q.sql_text,
      sub_report_id: containerKeyOf(q.sub_report_id),
      is_main: q.is_main,
      change_log: "",
    });
    // Reload only on selection change - the draft is the user's editable working copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, mode]);

  const containers = [
    { key: MAIN_SCOPE, title: tq("mainReport") },
    ...subReports.map((sr) => ({ key: sr.id, title: tq("subReportOption", { name: sr.name }) })),
  ];

  const startNew = () => {
    setMode("new");
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
  };

  const selectQuery = (id: string) => {
    setMode("edit");
    setSelectedId(id);
  };

  const wouldReplaceMain =
    draft.is_main &&
    queries.some(
      (o) => containerKeyOf(o.sub_report_id) === draft.sub_report_id && o.is_main && o.id !== selectedId
    );

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.sql_text.trim()) {
      toast.error(tq("errors.missingFields"));
      return;
    }
    const sub_report_id = draft.sub_report_id === MAIN_SCOPE ? null : draft.sub_report_id;

    if (mode === "new") {
      const res = await fetch(`/api/reports/${reportId}/queries`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, sql_text: draft.sql_text, is_main: draft.is_main, sub_report_id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? tq("errors.addFailed"));
        return;
      }
      const body = await res.json();
      toast.success(tq("success.add"));
      await fetchAll();
      if (body?.data?.id) {
        setMode("edit");
        setSelectedId(body.data.id);
      }
      return;
    }

    if (!selectedId) return;
    const res = await fetch(`/api/reports/${reportId}/queries`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, ...draft, sub_report_id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? tq("errors.saveFailed"));
      return;
    }
    toast.success(tq("success.save"));
    await fetchAll();
  };

  const handleCancel = () => {
    if (mode === "new") {
      setDraft(EMPTY_DRAFT);
      return;
    }
    const q = queries.find((x) => x.id === selectedId);
    if (q) {
      setDraft({
        name: q.name,
        sql_text: q.sql_text,
        sub_report_id: containerKeyOf(q.sub_report_id),
        is_main: q.is_main,
        change_log: "",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const res = await fetch(`/api/reports/${reportId}/queries?id=${selectedId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error(tq("errors.deleteFailed"));
      return;
    }
    toast.success(tq("success.delete"));
    setSelectedId(null);
    await fetchAll();
  };

  const insertParameter = (name: string) => {
    sqlEditorRef.current?.insertAtCursor(`:${name}`);
    setParamsOpen(false);
  };

  const containerVariables = variables.filter((v) => containerKeyOf(v.sub_report_id) === draft.sub_report_id);
  const analysis = React.useMemo(() => analyzeSql(draft.sql_text), [draft.sql_text]);
  const history = selectedId ? versionsByQuery[selectedId] ?? [] : [];
  const selectedVersion = queries.find((q) => q.id === selectedId)?.version;

  return (
    <div className="flex items-start gap-4">
      <aside className="w-72 flex-none self-start overflow-y-auto rounded-md border">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tq("listTitle")}</h3>
          <Button type="button" size="sm" variant="outline" onClick={startNew}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {tq("addButton")}
          </Button>
        </div>
        <div className="max-h-[36rem] space-y-3 overflow-y-auto p-2">
          {containers.map((container) => {
            const rows = queries.filter((q) => containerKeyOf(q.sub_report_id) === container.key);
            if (rows.length === 0) return null;
            return (
              <div key={container.key}>
                <div className="flex items-center gap-1.5 px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Database className="h-3 w-3" />
                  {container.title}
                </div>
                {rows.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => selectQuery(q.id)}
                    className={cn(
                      "mb-0.5 block w-full rounded-md border border-transparent px-2.5 py-2 text-left hover:bg-accent",
                      mode === "edit" && selectedId === q.id && "border-border bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{q.name}</span>
                      <span className="flex-none text-xs text-muted-foreground">v{q.version}</span>
                    </div>
                    {q.is_main && <Badge className="mt-1 text-[10px]">{tq("mainBadge")}</Badge>}
                  </button>
                ))}
              </div>
            );
          })}
          {queries.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">{tq("emptyStateDescription")}</p>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Select value={draft.sub_report_id} onValueChange={(v) => setDraft((d) => ({ ...d, sub_report_id: v }))}>
            <SelectTrigger className="h-7 w-auto gap-1.5 bg-secondary px-2 text-xs shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={MAIN_SCOPE}>{tq("mainReport")}</SelectItem>
                {subReports.map((sr) => (
                  <SelectItem key={sr.id} value={sr.id}>{tq("subReportOption", { name: sr.name })}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <span>{mode === "new" ? tq("versionNew") : selectedVersion ? `v${selectedVersion}` : ""}</span>
        </div>

        <div className="mb-1 flex items-center gap-3">
          <Input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder={tq("namePlaceholder")}
            className="h-auto flex-1 border-none bg-transparent px-1 text-lg font-semibold shadow-none focus-visible:ring-1"
          />
          <div className="flex flex-none items-center gap-2">
            <span className="text-xs text-muted-foreground">{tq("mainQueryLabel")}</span>
            <Switch checked={draft.is_main} onCheckedChange={(v) => setDraft((d) => ({ ...d, is_main: v }))} />
          </div>
        </div>
        {wouldReplaceMain && (
          <p className="mb-2 rounded-md bg-warning-bg px-2.5 py-1.5 text-xs text-warning">{tq("replaceMainWarning")}</p>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("h-7 rounded-none px-2.5 text-xs", editorTheme === "light" && "bg-accent")}
              onClick={() => setEditorTheme("light")}
            >
              {tq("themeLight")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("h-7 rounded-none border-l px-2.5 text-xs", editorTheme === "dark" && "bg-accent")}
              onClick={() => setEditorTheme("dark")}
            >
              {tq("themeDark")}
            </Button>
          </div>

          <Popover open={paramsOpen} onOpenChange={setParamsOpen}>
            <PopoverTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" />
                {tq("addParameter")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {tq("parametersPopoverTitle")}
              </p>
              {containerVariables.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">{tq("noParameters")}</p>
              ) : (
                containerVariables.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => insertParameter(v.name)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                  >
                    <span>:{v.name}</span>
                    <span className="text-[10px] text-muted-foreground">{v.data_type}</span>
                  </button>
                ))
              )}
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setDraft((d) => ({ ...d, sql_text: formatSql(d.sql_text) }))}
          >
            {tq("formatQuery")}
          </Button>
        </div>

        <SqlEditor
          ref={sqlEditorRef}
          value={draft.sql_text}
          onChange={(sql_text) => setDraft((d) => ({ ...d, sql_text }))}
          placeholder={tq("sqlPlaceholder")}
          editorTheme={editorTheme}
          className="h-80"
        />

        <div className="mt-3 rounded-md border p-3">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold">{tq("analysisTitle")}</h4>
            <span className="text-[11px] text-muted-foreground">{tq("containerDescription")}</span>
          </div>
          <div className="space-y-1.5">
            <AnalysisChips label={tq("tablesLabel")} items={analysis.tables} className="bg-chart-1/10 text-chart-1" />
            <AnalysisChips label={tq("fieldsLabel")} items={analysis.fields} className="bg-muted text-foreground" />
            <AnalysisChips label={tq("conditionsLabel")} items={analysis.conditions} className="bg-chart-4/10 text-chart-4" />
          </div>

          <details className="mt-2.5">
            <summary className="cursor-pointer text-xs text-muted-foreground">{tq("versionHistoryTitle")}</summary>
            <div className="mt-1.5 space-y-1.5 border-l pl-3">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tq("noVersionHistory")}</p>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="w-10 flex-none font-semibold text-muted-foreground">v{h.version}</span>
                    <span className="text-foreground/80">{h.change_log || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </details>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {mode === "edit" && (
            <Button type="button" variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={handleDelete}>
              {tc("delete")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleCancel}>{tc("cancel")}</Button>
          <Button type="button" onClick={handleSave}>{tc("save")}</Button>
        </div>
      </div>
    </div>
  );
}
