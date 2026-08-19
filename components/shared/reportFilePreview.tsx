"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export interface ReportFilePreviewFile {
  id: string;
  file_kind: string;
  file_name: string;
  file_type: string;
}

interface PreviewTable {
  headers: string[];
  rows: string[][];
}

export function isPdfFile(file: Pick<ReportFilePreviewFile, "file_name">): boolean {
  return file.file_name?.toLowerCase().endsWith(".pdf") ?? false;
}

export function isSpreadsheetFile(file: Pick<ReportFilePreviewFile, "file_name">): boolean {
  const name = file.file_name?.toLowerCase() ?? "";
  return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
}

/**
 * Shared preview body for a single report file - extracted from
 * ReportPreviewDialog (Phase 4c) so the detail page (Phase 5a) renders the
 * exact same PDF <embed> / Excel-as-table behaviour instead of a second
 * implementation that would drift the moment the 200-row cap or the
 * .report-print-area scope changes.
 *
 * The preview/download endpoints gate on can_export server-side (same as
 * Download), so a 404 here most often means "visible but not exportable" -
 * shown as a message rather than left blank.
 */
export function ReportFilePreview({
  reportId,
  file,
  className,
}: {
  reportId: string;
  file: ReportFilePreviewFile;
  className?: string;
}) {
  const [table, setTable] = React.useState<PreviewTable | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTable(null);
    setError(null);
    if (!isSpreadsheetFile(file)) return;

    setLoading(true);
    fetch(`/api/reports/${reportId}/files/${file.id}/preview`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (json?.success) {
          setTable(json.data);
        } else {
          setError(json?.error ?? "ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้");
        }
      })
      .catch(() => setError("ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้"))
      .finally(() => setLoading(false));
  }, [reportId, file]);

  if (isPdfFile(file)) {
    return (
      <embed
        src={`/api/reports/${reportId}/files/${file.id}/download`}
        type="application/pdf"
        className={className ?? "w-full h-[60vh]"}
      />
    );
  }

  if (isSpreadsheetFile(file)) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> กำลังโหลดตาราง...
        </div>
      );
    }
    if (error) {
      return <p className="py-8 text-center text-muted-foreground">{error}</p>;
    }
    if (table) {
      return (
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
      );
    }
    return null;
  }

  return (
    <p className="py-8 text-center text-muted-foreground">
      ไฟล์ประเภทนี้ไม่รองรับการแสดงตัวอย่าง — ดาวน์โหลดเพื่อเปิดไฟล์
    </p>
  );
}
