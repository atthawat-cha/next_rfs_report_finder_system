"use client";

import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import { FILE_PURPOSE_LABEL, type FilePurpose } from "@/lib/file-purpose";
import { History as HistoryIcon } from "lucide-react";
import toast from "react-hot-toast";

interface HistoryFileRow {
  id: string;
  file_name: string;
  version: string;
  is_current: boolean;
}

interface QueryVersionRow {
  id: string;
  version: string;
  sql_text: string;
  change_log: string | null;
}

interface HistoryQueryRow {
  id: string;
  name: string;
  report_query_versions: QueryVersionRow[];
}

interface VersionHistory {
  files: Record<string, HistoryFileRow[]>;
  queries: HistoryQueryRow[];
}

const EMPTY_HISTORY: VersionHistory = { files: {}, queries: [] };

export function HistoryTab({ reportId }: { reportId: string }) {
  const [history, setHistory] = React.useState<VersionHistory>(EMPTY_HISTORY);

  const fetchAll = useCallback(async () => {
    const res = await fetch(`/api/reports/${reportId}/versions`, { credentials: "include" });
    if (res.ok) {
      const json = await res.json();
      if (json?.success) setHistory(json.data);
    }
  }, [reportId]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRollbackFile = async (row: HistoryFileRow) => {
    const res = await fetch(`/api/reports/${reportId}/versions/rollback`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "file", report_files_id: row.id }),
    });
    if (!res.ok) {
      toast.error("ย้อนกลับไม่สำเร็จ");
      return;
    }
    toast.success(`ย้อนกลับไปยังเวอร์ชัน v${row.version} แล้ว`);
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
      toast.error("ย้อนกลับไม่สำเร็จ");
      return;
    }
    toast.success(`ย้อนกลับไปยังเวอร์ชัน v${version.version} แล้ว`);
    fetchAll();
  };

  const fileKinds = Object.keys(history.files);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">ประวัติเวอร์ชัน</CardTitle>
        </div>
        <CardDescription>ประวัติไฟล์และคิวรี่ทุกเวอร์ชัน — กดย้อนกลับเพื่อย้อนกลับไปเวอร์ชันเก่า</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fileKinds.length === 0 && history.queries.length === 0 && (
          <FieldDescription>ยังไม่มีประวัติเวอร์ชัน</FieldDescription>
        )}

        {fileKinds.map((kind) => {
          const rows = history.files[kind] ?? [];
          if (rows.length === 0) return null;
          return (
            <div key={kind} className="space-y-2">
              <FieldLabel>{FILE_PURPOSE_LABEL[kind as FilePurpose] ?? kind}</FieldLabel>
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
                        ย้อนกลับ
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
                      ย้อนกลับ
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
