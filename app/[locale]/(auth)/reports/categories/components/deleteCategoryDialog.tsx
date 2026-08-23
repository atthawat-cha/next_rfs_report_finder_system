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
import type { CategoryRow } from "./categoryTypes";

/**
 * Delete confirmation for a categories row. The API blocks the delete
 * outright (409) if any report or child category still references it -
 * reports.category_id has no onDelete rule, so a raw DELETE would otherwise
 * surface a Postgres FK-violation 500.
 */
export function DeleteCategoryDialog({
  category,
  onOpenChange,
  onDeleted,
}: {
  category: CategoryRow | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = React.useState(false);

  const handleConfirm = async () => {
    if (!category) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/categories/${category.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? "ลบไม่สำเร็จ");
        return;
      }
      toast.success("ลบหมวดหมู่เรียบร้อย");
      onOpenChange(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> ลบหมวดหมู่
          </DialogTitle>
          <DialogDescription>
            ลบ &ldquo;{category?.name}&rdquo; ({category?.code}) — ลบไม่ได้ถ้ามีรายงานหรือหมวดหมู่ย่อยอ้างอิงอยู่
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            ยกเลิก
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            ยืนยันลบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
