"use client";

import * as React from "react";
import { ContentLayout } from "@/components/layouts/content-layout";
import DefaultBreadcrumb from "@/components/shared/breadcrumb";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
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

  const columns = React.useMemo(() => getTicketQueueColumns((row) => setEditingTicket(row)), []);

  return (
    <ContentLayout title="Ticket Queue">
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb />
      </div>

      <Card className="container mx-auto py-10 gap-6 mt-5 px-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl md:text-3xl font-bold">Ticket Queue</h4>
        </div>

        <div className="flex gap-3 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">ทุกความสำคัญ</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-5" />

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> กำลังโหลด...
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
