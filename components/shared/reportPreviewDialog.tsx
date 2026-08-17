"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";

interface ReportFileRow {
  id: string;
  file_kind: string;
  file_name: string;
  file_type: string;
}

interface ReportDetail {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  description: string | null;
  files: ReportFileRow[];
}

interface PreviewTable {
  headers: string[];
  rows: string[][];
}

function isPdf(file: ReportFileRow): boolean {
  return file.file_name?.toLowerCase().endsWith(".pdf") ?? false;
}

function isSpreadsheet(file: ReportFileRow): boolean {
  const name = file.file_name?.toLowerCase() ?? "";
  return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
}

/**
 * Preview dialog for a report's current files - inline PDF viewer (native
 * browser embed, no library), Excel-as-table preview (parsed server-side,
 * see app/api/reports/[id]/files/[fileId]/preview), and a print button
 * scoped to just the preview content via the .report-print-area rule below.
 *
 * Controlled (open/onOpenChange from the caller) rather than owning an
 * internal DialogTrigger - nesting a Radix DialogTrigger inside a
 * DropdownMenuItem is a known footgun (the dropdown's own close-on-select
 * behavior fights the dialog's open state). Callers instead hold
 * "which report id is being previewed" in their own state and flip it from
 * a plain onClick in their dropdown menu.
 */
export function ReportPreviewDialog({
  reportId,
  open,
  onOpenChange,
}: {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [report, setReport] = React.useState<ReportDetail | null>(null);
  const [activeFileId, setActiveFileId] = React.useState<string | null>(null);
  const [table, setTable] = React.useState<PreviewTable | null>(null);
  const [tableLoading, setTableLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !reportId) {
      setReport(null);
      setActiveFileId(null);
      return;
    }
    setLoading(true);
    fetch(`/api/reports/${reportId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success) {
          setReport(json.data);
          const firstFile = json.data.files?.[0] as ReportFileRow | undefined;
          setActiveFileId(firstFile?.id ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [open, reportId]);

  const activeFile = report?.files.find((f) => f.id === activeFileId) ?? null;

  React.useEffect(() => {
    if (!activeFile || !isSpreadsheet(activeFile)) {
      setTable(null);
      return;
    }
    setTableLoading(true);
    fetch(`/api/reports/${reportId}/files/${activeFile.id}/preview`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success) setTable(json.data);
      })
      .finally(() => setTableLoading(false));
  }, [activeFile, reportId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{report?.name_th ?? "กำลังโหลด..."}</DialogTitle>
          <DialogDescription>{report?.description}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> กำลังโหลด...
          </div>
        )}

        {!loading && report && report.files.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">ไม่มีไฟล์สำหรับรายงานนี้</p>
        )}

        {!loading && report && report.files.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 border-b pb-3">
              {report.files.map((file) => (
                <Button
                  key={file.id}
                  size="sm"
                  variant={file.id === activeFileId ? "default" : "outline"}
                  onClick={() => setActiveFileId(file.id)}
                >
                  {file.file_kind}
                </Button>
              ))}
            </div>

            <div className="report-print-area flex-1 overflow-auto">
              {activeFile && isPdf(activeFile) && (
                <embed
                  src={`/api/reports/${reportId}/files/${activeFile.id}/download`}
                  type="application/pdf"
                  className="w-full h-[60vh]"
                />
              )}

              {activeFile && isSpreadsheet(activeFile) && (
                <>
                  {tableLoading && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" /> กำลังโหลดตาราง...
                    </div>
                  )}
                  {!tableLoading && table && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {table.headers.map((h, i) => (
                            <TableHead key={i}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.rows.map((row, ri) => (
                          <TableRow key={ri}>
                            {row.map((cell, ci) => (
                              <TableCell key={ci}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}

              {activeFile && !isPdf(activeFile) && !isSpreadsheet(activeFile) && (
                <p className="py-8 text-center text-muted-foreground">
                  ไฟล์ประเภทนี้ไม่รองรับการแสดงตัวอย่าง — ดาวน์โหลดเพื่อเปิดไฟล์
                </p>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          {activeFile && (
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> พิมพ์
              </Button>
              <Button asChild>
                <a href={`/api/reports/${reportId}/files/${activeFile.id}/download`} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" /> ดาวน์โหลด
                </a>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
