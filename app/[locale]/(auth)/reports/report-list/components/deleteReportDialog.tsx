"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { ReportGetDataType } from "@/lib/types";

/**
 * Delete confirmation for a report row - same pattern as
 * reports/categories/components/deleteCategoryDialog.tsx. Backend is
 * admin-only (GET/PUT/DELETE /api/reports/report/manage/[id] all gate on
 * routeAcceptted('admin')) and cascades to report_files/report_queries/
 * report_variables/report_permissions/favorites/downloads/etc via
 * onDelete: Cascade in schema.prisma - this dialog is only ever rendered
 * from an isAdmin-gated action, never as an extra server-side check.
 */
export function DeleteReportDialog({
  report,
  onOpenChange,
  onDeleted,
}: {
  report: ReportGetDataType | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("reports.list.delete");
  const tc = useTranslations("common");
  const [deleting, setDeleting] = React.useState(false);

  const handleConfirm = async () => {
    if (!report?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/report/manage/${report.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? t("deleteFailed"));
        return;
      }
      toast.success(t("deleteSuccess"));
      onOpenChange(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={report !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { name: report?.name_th ?? "", code: report?.code ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
