"use client";

import * as React from "react";
import { ContentLayout } from "@/components/layouts/content-layout";
import DefaultBreadcrumb from "@/components/shared/breadcrumb";
import { SharedDataTable } from "@/components/shared/dataTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Info } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { getMenusColumn, type MenuRow } from "./components/menusColumn";
import { MenuFormDialog } from "./components/menuFormDialog";
import { DeleteMenuDialog } from "./components/deleteMenuDialog";

/**
 * Admin CRUD over the menus table (Phase 5d). These rows back the
 * permission model (permissions.menu_id -> menus.id, consumed by
 * app/(auth)/permissions/page.tsx, Phase 5c) - they are a SEPARATE
 * structure from the sidebar, which still renders the static
 * lib/menu-list.ts (Phase 5 decision 7). Editing here has no visual effect
 * on navigation; the on-screen note below exists so the next person doesn't
 * assume otherwise.
 *
 * No client-side admin gate - matches this repo's established pattern of
 * relying on the API's 403 as the real boundary.
 */
export default function MenusManagementPage() {
  const t = useTranslations("settings.menus");
  const tc = useTranslations("common");
  const [menus, setMenus] = React.useState<MenuRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [forbidden, setForbidden] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingMenu, setEditingMenu] = React.useState<MenuRow | null>(null);
  const [deletingMenu, setDeletingMenu] = React.useState<MenuRow | null>(null);

  const fetchMenus = React.useCallback(() => {
    setLoading(true);
    fetch("/api/baseconfig/menus", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success) setMenus(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleSortOrderChange = React.useCallback(
    async (id: string, sortOrder: number) => {
      const res = await fetch(`/api/baseconfig/menus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sort_order: sortOrder }),
      });
      if (!res.ok) {
        toast.error(t("sortOrderUpdateFailed"));
        return;
      }
      fetchMenus();
    },
    [fetchMenus, t]
  );

  const columns = React.useMemo(
    () =>
      getMenusColumn(
        (row) => {
          setEditingMenu(row);
          setFormOpen(true);
        },
        (row) => setDeletingMenu(row),
        handleSortOrderChange,
        t,
        tc
      ),
    [handleSortOrderChange, t, tc]
  );

  return (
    <ContentLayout title={t("pageTitle")}>
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb items={[
          { label: tc('breadcrumbDashboard'), href: '/dashboard' },
          { label: t('pageTitle') },
        ]} />
      </div>

      <Card className="container mx-auto py-10 gap-6 mt-5 px-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl md:text-3xl font-bold">{t("cardTitle")}</h4>
          <Button
            onClick={() => {
              setEditingMenu(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> {t("newMenu")}
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground mt-4">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            {t.rich("noteText", {
              strong: (chunks) => <strong>{chunks}</strong>,
              code: (chunks) => <code>{chunks}</code>,
            })}
          </p>
        </div>

        <Separator className="my-5" />

        {forbidden && <p className="text-muted-foreground">{t("forbidden")}</p>}

        {!forbidden && loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> {tc("loading")}
          </div>
        )}

        {!forbidden && !loading && <SharedDataTable columns={columns} data={menus} />}
      </Card>

      <MenuFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        menu={editingMenu}
        onSaved={fetchMenus}
      />

      <DeleteMenuDialog
        menu={deletingMenu}
        onOpenChange={(open) => !open && setDeletingMenu(null)}
        onDeleted={fetchMenus}
      />
    </ContentLayout>
  );
}
