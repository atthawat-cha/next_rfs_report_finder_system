"use client";

import * as React from "react";
import { ContentLayout } from "@/components/layouts/content-layout";
import DefaultBreadcrumb from "@/components/shared/breadcrumb";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { TicketDataTable } from "../components/ticketTable";
import { getTicketQueueColumns } from "./components/ticketQueueColumn";
import { TicketEditDialog } from "./components/ticketEditDialog";
import type { TicketRow } from "../components/ticketTypes";

/**
 * Admin ticket queue (Phase 7e) — every ticket, filterable by status/
 * priority. No client-side admin gate, matching this repo's established
 * pattern (settings/menus, etc.) of relying on the API's 403 as the real
 * boundary; GET /api/tickets itself scopes non-admins to their own tickets
 * only, so a non-admin visiting this page just sees their own list here too.
 */
export default function TicketQueuePage() {
  const t = useTranslations("tickets.queue");
  const tCol = useTranslations("tickets.columns");
  const tc = useTranslations("common");
  const tp = useTranslations("tickets.priority");
  const ts = useTranslations("tickets.status");
  const [tickets, setTickets] = React.useState<TicketRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [editingTicket, setEditingTicket] = React.useState<TicketRow | null>(null);

  const fetchTickets = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    fetch(`/api/tickets?${params.toString()}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setTickets(json.data);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, priorityFilter]);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const columns = React.useMemo(() => getTicketQueueColumns((row) => setEditingTicket(row), tCol), [tCol]);

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
        </div>

        <div className="flex gap-3 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="OPEN">{ts("OPEN")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{ts("IN_PROGRESS")}</SelectItem>
                <SelectItem value="RESOLVED">{ts("RESOLVED")}</SelectItem>
                <SelectItem value="CLOSED">{ts("CLOSED")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("allPriorities")}</SelectItem>
                <SelectItem value="LOW">{tp("LOW")}</SelectItem>
                <SelectItem value="MEDIUM">{tp("MEDIUM")}</SelectItem>
                <SelectItem value="HIGH">{tp("HIGH")}</SelectItem>
                <SelectItem value="CRITICAL">{tp("CRITICAL")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-5" />

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> {tc("loading")}
          </div>
        ) : (
          <TicketDataTable columns={columns} data={tickets} />
        )}
      </Card>

      <TicketEditDialog
        ticket={editingTicket}
        onOpenChange={(open) => !open && setEditingTicket(null)}
        onSaved={fetchTickets}
      />
    </ContentLayout>
  );
}
