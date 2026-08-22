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
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { MenuRow } from "./menusColumn";

interface FormState {
  group_label: string;
  catagory_label: string;
  menu_label: string;
  sub_menu_label: string;
  href: string;
  icon: string;
  sort_order: string;
}

const EMPTY_FORM: FormState = {
  group_label: "",
  catagory_label: "",
  menu_label: "",
  sub_menu_label: "",
  href: "",
  icon: "",
  sort_order: "0",
};

function toFormState(menu: MenuRow | null): FormState {
  if (!menu) return EMPTY_FORM;
  return {
    group_label: menu.group_label ?? "",
    catagory_label: menu.catagory_label ?? "",
    menu_label: menu.menu_label ?? "",
    sub_menu_label: menu.sub_menu_label ?? "",
    href: menu.href ?? "",
    icon: menu.icon ?? "",
    sort_order: String(menu.sort_order ?? 0),
  };
}

/**
 * Controlled create/edit dialog for a menus row - not
 * components/shared/dialog-drawer.tsx's DrawerDialogDemo, which ignores the
 * isOpen prop it's given (its own internal Dialog manages open state
 * unconditionally) and can't be seeded with existing data for edit. Same
 * reasoning as 5b's ReportPermissionsDrawer choosing Sheet over the old
 * components/shared/right-drawer.tsx (removed in Phase 6a) - the
 * "reference" shared component turned out to be a non-functional demo
 * scaffold.
 */
export function MenuFormDialog({
  open,
  onOpenChange,
  menu,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: MenuRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(toFormState(menu));
  }, [open, menu]);

  const isEdit = menu !== null;

  const handleChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.group_label.trim() || !form.catagory_label.trim()) {
      toast.error("กรุณากรอก Group และ Category");
      return;
    }
    setSaving(true);
    try {
      const body = {
        group_label: form.group_label.trim(),
        catagory_label: form.catagory_label.trim(),
        menu_label: form.menu_label.trim() || null,
        sub_menu_label: form.sub_menu_label.trim() || null,
        href: form.href.trim() || null,
        icon: form.icon.trim() || null,
        sort_order: Number(form.sort_order) || 0,
      };

      const res = await fetch(isEdit ? `/api/baseconfig/menus/${menu!.id}` : "/api/baseconfig/menus", {
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
      toast.success(isEdit ? "แก้ไขเมนูเรียบร้อย" : "สร้างเมนูเรียบร้อย");
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
          <DialogTitle>{isEdit ? "แก้ไขเมนู" : "สร้างเมนูใหม่"}</DialogTitle>
          <DialogDescription>
            แถวเหล่านี้ขับเคลื่อนโมเดลสิทธิ์ (permissions/role_permissions) เท่านั้น — ไม่กระทบเมนู sidebar จริง
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="group_label">Group *</Label>
            <Input id="group_label" value={form.group_label} onChange={handleChange("group_label")} />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="catagory_label">Category *</Label>
            <Input id="catagory_label" value={form.catagory_label} onChange={handleChange("catagory_label")} />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="menu_label">Menu (ว่าง = เป็นรายการระดับบนสุด)</Label>
            <Input id="menu_label" value={form.menu_label} onChange={handleChange("menu_label")} />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="sub_menu_label">Sub-menu</Label>
            <Input id="sub_menu_label" value={form.sub_menu_label} onChange={handleChange("sub_menu_label")} />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="href">Href</Label>
            <Input id="href" value={form.href} onChange={handleChange("href")} placeholder="/example/path" />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="icon">Icon (lucide name)</Label>
            <Input id="icon" value={form.icon} onChange={handleChange("icon")} placeholder="Settings" />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="sort_order">Sort order</Label>
            <Input id="sort_order" type="number" value={form.sort_order} onChange={handleChange("sort_order")} />
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
