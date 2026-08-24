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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("reports.tags.form");
  const tc = useTranslations("common");
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(toFormState(tag));
  }, [open, tag]);

  const isEdit = tag !== null;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error(t("missingFields"));
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
        toast.error(message ?? t("saveFailed"));
        return;
      }
      toast.success(isEdit ? t("editSuccess") : t("createSuccess"));
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
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tag_name">{tc("name")}</Label>
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
            <Label htmlFor="tag_description">{tc("description")}</Label>
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
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
