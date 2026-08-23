'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import DefaultBreadcrumb from '@/components/shared/breadcrumb'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import React from 'react'
import { Separator } from '@/components/ui/separator'
import { SkeletonTable } from '@/components/shared/skeletonTable'
import { TicketDataTable } from './components/ticketTable'
import { myTicketColumns } from './components/ticketColumn'
import { CreateTicketDialog } from './components/createTicketDialog'
import type { TicketRow } from './components/ticketTypes'

/**
 * "My Tickets" — any authenticated user (Phase 7e). Admin-only management of
 * every ticket lives at /tickets/manage.
 */
export default function MyTicketsPage() {
  const [tickets, setTickets] = React.useState<TicketRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const fetchTickets = React.useCallback(() => {
    setLoading(true);
    fetch('/api/tickets', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setTickets(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <ContentLayout title="My Tickets">
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb />
      </div>

      <Card className="container mx-auto py-10 gap-6 mt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xl md:text-3xl font-bold">คำขอ/แจ้งปัญหาของฉัน</h4>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> แจ้งปัญหาใหม่
          </Button>
        </div>
        <Separator className="my-5" />
        {loading ? <SkeletonTable /> : <TicketDataTable columns={myTicketColumns} data={tickets} />}
      </Card>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchTickets} />
    </ContentLayout>
  )
}
