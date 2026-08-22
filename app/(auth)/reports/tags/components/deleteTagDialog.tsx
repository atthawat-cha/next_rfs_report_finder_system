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
import type { TagRow } from "./tagTypes";

/**
 * Delete confirmation for a tags row. Unlike categories, this never blocks -
 * tags -> report_tags cascades in schema.prisma, so deleting just un-tags
 * whatever reports had it.
 */
export function DeleteTagDialog({
  tag,
  onOpenChange,
  onDeleted,
}: {
  tag: TagRow | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = React.useState(false);

  const handleConfirm = async () => {
    if (!tag) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/tags/${tag.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? "ลบไม่สำเร็จ");
        return;
      }
      toast.success("ลบแท็กเรียบร้อย");
      onOpenChange(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={tag !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> ลบแท็ก
          </DialogTitle>
          <DialogDescription>
            ลบ &ldquo;{tag?.name}&rdquo; — รายงานที่มีแท็กนี้จะถูกตัดออกจากแท็กนี้ (ไม่กระทบตัวรายงาน)
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
