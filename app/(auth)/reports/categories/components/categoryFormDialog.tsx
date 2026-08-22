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
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { CategoryRow } from "./categoryTypes";

interface FormState {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { name: "", code: "", description: "", is_active: true };

function toFormState(category: CategoryRow | null): FormState {
  if (!category) return EMPTY_FORM;
  return {
    name: category.name,
    code: category.code,
    description: category.description ?? "",
    is_active: category.is_active,
  };
}

/**
 * Controlled create/edit dialog for a categories row - not
 * components/shared/dialog-drawer.tsx's DrawerDialogDemo, which ignores the
 * isOpen prop it's given and can't be seeded with existing data for edit
 * (same reasoning as settings/menus's MenuFormDialog).
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(toFormState(category));
  }, [open, category]);

  const isEdit = category !== null;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("กรุณากรอกชื่อและโค้ด");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      const res = await fetch(
        isEdit ? `/api/reports/categories/${category!.id}` : "/api/reports/categories",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        const message = Array.isArray(json?.error) ? json.error[0]?.message : json?.error;
        toast.error(message ?? "บันทึกไม่สำเร็จ");
        return;
      }
      toast.success(isEdit ? "แก้ไขหมวดหมู่เรียบร้อย" : "สร้างหมวดหมู่เรียบร้อย");
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
          <DialogTitle>{isEdit ? "แก้ไขหมวดหมู่" : "สร้างหมวดหมู่ใหม่"}</DialogTitle>
          <DialogDescription>จัดการหมวดหมู่รายงาน</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat_name">Name</Label>
            <Input
              id="cat_name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat_code">Code</Label>
            <Input
              id="cat_code"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat_description">Description</Label>
            <Textarea
              id="cat_description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={saving}
            />
          </div>
          <Field orientation="horizontal" className="w-fit">
            <Switch
              id="cat_status"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              disabled={saving}
            />
            <FieldLabel htmlFor="cat_status">{form.is_active ? "Active" : "Inactive"}</FieldLabel>
          </Field>
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
