"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";

type FlagKey = "can_view" | "can_edit" | "can_delete" | "can_favorite" | "can_export" | "can_print";

interface Grant {
  id: string;
  subject_type: "USER" | "ROLE";
  subject_id: string;
  subject_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_favorite: boolean;
  can_export: boolean;
  can_print: boolean;
}

interface SubjectOption {
  value: string;
  label: string;
}

const FLAG_KEYS: FlagKey[] = ["can_view", "can_edit", "can_delete", "can_favorite", "can_export", "can_print"];

/**
 * Per-report ACL editor over the four report_permissions handlers that have
 * existed since Phase 2a with zero UI. Built on Sheet (Radix Dialog under
 * the hood, side="right") rather than a hand-rolled drawer shell - the repo
 * had one (components/shared/right-drawer.tsx, removed in Phase 6a) but it
 * was an uncontrolled demo scaffold hardcoded to a bottom sheet regardless
 * of its "right" direction prop, not a reusable controlled shell.
 *
 * Controlled (open/onOpenChange from the caller), same reason as
 * ReportPreviewDialog: callers open this from a DropdownMenuItem, and a
 * Trigger nested there fights the dropdown's own close-on-select behavior.
 *
 * No client-side admin gate - matches the repo's established pattern
 * (e.g. /settings/general) of letting the API's 403 be the real boundary;
 * a non-admin opening this sees a plain "no access" message instead.
 */
export function ReportPermissionsDrawer({
  reportId,
  open,
  onOpenChange,
}: {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("reports.permissionsDrawer");
  const [loading, setLoading] = React.useState(false);
  const [forbidden, setForbidden] = React.useState(false);
  const [grants, setGrants] = React.useState<Grant[] | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const [subjectType, setSubjectType] = React.useState<"USER" | "ROLE">("USER");
  const [users, setUsers] = React.useState<SubjectOption[] | null>(null);
  const [roles, setRoles] = React.useState<SubjectOption[] | null>(null);
  const [selectedSubject, setSelectedSubject] = React.useState<SubjectOption | null>(null);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    if (!open || !reportId) {
      setGrants(null);
      setForbidden(false);
      setSelectedSubject(null);
      setAddError(null);
      setConfirmDeleteId(null);
      return;
    }

    setLoading(true);
    setForbidden(false);
    fetch(`/api/reports/${reportId}/permissions`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success) setGrants(json.data);
      })
      .finally(() => setLoading(false));
  }, [open, reportId]);

  // Both lists are small admin-only lookups fetched once per drawer session
  // (GET /api/users/user and /api/users/roles have no server-side search),
  // then filtered client-side by the combobox as the admin types.
  React.useEffect(() => {
    if (!open) return;
    if (users === null) {
      fetch("/api/users/user", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.success) {
            setUsers(
              json.data.map((u: { id: string; first_name: string; last_name: string; username: string }) => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name}`.trim() || u.username,
              }))
            );
          } else {
            setUsers([]);
          }
        })
        .catch(() => setUsers([]));
    }
    if (roles === null) {
      fetch("/api/users/roles", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          const list = Array.isArray(json) ? json : [];
          setRoles(
            list.map((r: { id: string; name: string; display_name?: string }) => ({
              value: r.id,
              label: r.display_name || r.name,
            }))
          );
        })
        .catch(() => setRoles([]));
    }
  }, [open, users, roles]);

  const subjectOptions = subjectType === "USER" ? users ?? [] : roles ?? [];

  async function toggleFlag(grant: Grant, flag: FlagKey) {
    if (!reportId) return;
    setSavingId(grant.id);
    try {
      const res = await fetch(`/api/reports/${reportId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: grant.id, [flag]: !grant[flag] }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error?.[0]?.message ?? json?.error ?? t("errors.saveFailed"));
        return;
      }
      setGrants((prev) => prev?.map((g) => (g.id === grant.id ? { ...g, ...json.data } : g)) ?? prev);
    } finally {
      setSavingId(null);
    }
  }

  async function handleAdd() {
    if (!reportId || !selectedSubject) return;
    setAddError(null);
    setAdding(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject_type: subjectType, subject_id: selectedSubject.value }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        const message = Array.isArray(json?.error) ? json.error[0]?.message : json?.error;
        setAddError(message ?? t("errors.addFailed"));
        return;
      }
      setGrants((prev) => [...(prev ?? []), { ...json.data, subject_name: selectedSubject.label }]);
      setSelectedSubject(null);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(grant: Grant) {
    if (!reportId) return;
    const res = await fetch(`/api/reports/${reportId}/permissions?id=${grant.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error(t("errors.deleteFailed"));
      return;
    }
    setGrants((prev) => prev?.filter((g) => g.id !== grant.id) ?? prev);
    setConfirmDeleteId(null);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>
            {t("description")}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("loading")}
          </div>
        )}

        {!loading && forbidden && (
          <p className="py-12 text-center text-muted-foreground">{t("forbidden")}</p>
        )}

        {!loading && !forbidden && grants && (
          <div className="mt-4 space-y-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("grantedTo")}</TableHead>
                    {FLAG_KEYS.map((key) => (
                      <TableHead key={key} className="text-center">
                        {t(`flags.${key}`)}
                      </TableHead>
                    ))}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={FLAG_KEYS.length + 2} className="text-center text-muted-foreground">
                        {t("noGrants")}
                      </TableCell>
                    </TableRow>
                  )}
                  {grants.map((grant) => (
                    <TableRow key={grant.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{grant.subject_name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {grant.subject_type}
                          </Badge>
                        </div>
                      </TableCell>
                      {FLAG_KEYS.map((key) => (
                        <TableCell key={key} className="text-center">
                          <Checkbox
                            checked={grant[key]}
                            disabled={savingId === grant.id}
                            onCheckedChange={() => toggleFlag(grant, key)}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        {confirmDeleteId === grant.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(grant)}>
                              {t("delete")}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                              {t("cancel")}
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(grant.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">{t("addNewTitle")}</p>
              <ToggleGroup
                type="single"
                variant="outline"
                value={subjectType}
                onValueChange={(v) => {
                  if (!v) return;
                  setSubjectType(v as "USER" | "ROLE");
                  setSelectedSubject(null);
                  setAddError(null);
                }}
              >
                <ToggleGroupItem value="USER">{t("subjectTypeUser")}</ToggleGroupItem>
                <ToggleGroupItem value="ROLE">{t("subjectTypeRole")}</ToggleGroupItem>
              </ToggleGroup>

              <div className="flex gap-2">
                <Combobox items={subjectOptions} value={selectedSubject} onValueChange={(v) => setSelectedSubject(v)}>
                  <ComboboxInput
                    className="flex-1"
                    placeholder={subjectType === "USER" ? t("searchUserPlaceholder") : t("searchRolePlaceholder")}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>{t("noSubjectResults")}</ComboboxEmpty>
                    <ComboboxList>
                      {(item: SubjectOption) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <Button onClick={handleAdd} disabled={!selectedSubject || adding}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
