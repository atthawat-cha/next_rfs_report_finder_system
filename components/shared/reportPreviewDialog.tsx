"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { ReportFilePreview, type ReportFilePreviewFile } from "@/components/shared/reportFilePreview";

interface ReportDetail {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  description: string | null;
  files: ReportFilePreviewFile[];
}

/**
 * Preview dialog for a report's current files - the actual PDF/Excel
 * rendering lives in components/shared/reportFilePreview.tsx (shared with
 * the report detail page, Phase 5a), this component owns file selection,
 * the dialog chrome, and the print/download footer actions.
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
  const t = useTranslations("reports.previewDialog");
  const [loading, setLoading] = React.useState(false);
  const [report, setReport] = React.useState<ReportDetail | null>(null);
  const [activeFileId, setActiveFileId] = React.useState<string | null>(null);

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
          const firstFile = json.data.files?.[0] as ReportFilePreviewFile | undefined;
          setActiveFileId(firstFile?.id ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [open, reportId]);

  const activeFile = report?.files.find((f) => f.id === activeFileId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{report?.name_th ?? t("loading")}</DialogTitle>
          <DialogDescription>{report?.description}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("loading")}
          </div>
        )}

        {!loading && report && report.files.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">{t("noFiles")}</p>
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
              {activeFile && <ReportFilePreview reportId={reportId as string} file={activeFile} />}
            </div>
          </>
        )}

        <DialogFooter>
          {activeFile && (
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> {t("print")}
              </Button>
              <Button asChild>
                <a href={`/api/reports/${reportId}/files/${activeFile.id}/download`} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" /> {t("download")}
                </a>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
