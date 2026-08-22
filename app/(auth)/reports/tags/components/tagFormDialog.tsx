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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { TagRow } from "./tagTypes";

interface FormState {
  name: string;
  slug: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: "", slug: "", description: "" };

function toFormState(tag: TagRow | null): FormState {
  if (!tag) return EMPTY_FORM;
  return { name: tag.name, slug: tag.slug, description: tag.description ?? "" };
}

/**
 * Controlled create/edit dialog for a tags row - same reasoning as
 * categories/components/categoryFormDialog.tsx for not extending
 * DrawerDialogDemo.
 */
export function TagFormDialog({
  open,
  onOpenChange,
  tag,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: TagRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(toFormState(tag));
  }, [open, tag]);

  const isEdit = tag !== null;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("กรุณากรอกชื่อและ slug");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
      };
      const res = await fetch(isEdit ? `/api/reports/tags/${tag!.id}` : "/api/reports/tags", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        const message = Array.isArray(json?.error) ? json.error[0]?.message : json?.error;
        toast.error(message ?? "บันทึกไม่สำเร็จ");
        return;
      }
      toast.success(isEdit ? "แก้ไขแท็กเรียบร้อย" : "สร้างแท็กเรียบร้อย");
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขแท็ก" : "สร้างแท็กใหม่"}</DialogTitle>
          <DialogDescription>จัดการแท็กรายงาน</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tag_name">Name</Label>
            <Input
              id="tag_name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag_slug">Slug</Label>
            <Input
              id="tag_slug"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag_description">Description</Label>
            <Textarea
              id="tag_description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
