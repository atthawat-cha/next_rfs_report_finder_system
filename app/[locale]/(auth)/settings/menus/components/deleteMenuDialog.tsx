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
import type { MenuRow } from "./menusColumn";

/**
 * Delete confirmation for a menus row. Always runs ?dry_run=1 first to show
 * how many permissions/role_permissions rows would cascade away (menus ->
 * permissions -> role_permissions is ON DELETE CASCADE) before the real
 * DELETE, per the 5d plan's explicit requirement - deleting a menu in
 * active use silently strips every role's grant on it with no way back.
 */
export function DeleteMenuDialog({
  menu,
  onOpenChange,
  onDeleted,
}: {
  menu: MenuRow | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("settings.menus.delete");
  const tc = useTranslations("common");
  const [counts, setCounts] = React.useState<{ permissions_count: number; role_permissions_count: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!menu) {
      setCounts(null);
      return;
    }
    setLoading(true);
    fetch(`/api/baseconfig/menus/${menu.id}?dry_run=1`, { method: "DELETE", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setCounts(json.data);
      })
      .finally(() => setLoading(false));
  }, [menu]);

  const handleConfirm = async () => {
    if (!menu) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/baseconfig/menus/${menu.id}`, { method: "DELETE", credentials: "include" });
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
    <Dialog open={menu !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { label: menu?.catagory_label ?? menu?.menu_label ?? "", group: menu?.group_label ?? "" })}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("checkingImpact")}
          </div>
        )}

        {!loading && counts && (
          <p className="text-sm">
            {t.rich("impactWarning", {
              permissionsCount: counts.permissions_count,
              rolePermissionsCount: counts.role_permissions_count,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting || loading}>
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
