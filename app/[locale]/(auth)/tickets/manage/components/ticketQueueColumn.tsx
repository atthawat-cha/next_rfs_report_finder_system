'use client'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { PriorityBadge, StatusBadge } from '../../components/ticketBadges'
import type { TicketRow } from '../../components/ticketTypes'

function userLabel(user: TicketRow['requester']): string {
    if (!user) return '-'
    const name = `${user.first_name} ${user.last_name}`.trim()
    return name || user.username
}

export function getTicketQueueColumns(onEdit: (row: TicketRow) => void, t: (key: string) => string): ColumnDef<TicketRow>[] {
    return [
        {
            accessorKey: 'ticket_number',
            header: t('ticketNumber'),
        },
        {
            accessorKey: 'subject',
            header: t('subject'),
        },
        {
            id: 'requester',
            header: t('requester'),
            cell: ({ row }) => userLabel(row.original.requester),
        },
        {
            accessorKey: 'category',
            header: t('category'),
        },
        {
            accessorKey: 'priority',
            header: t('priority'),
            cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
        },
        {
            accessorKey: 'status',
            header: t('status'),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'assignee',
            header: t('assignedTo'),
            cell: ({ row }) => userLabel(row.original.assignee),
        },
        {
            accessorKey: 'created_at',
            header: t('createdAt'),
            cell: ({ row }) => formatDateTime(row.original.created_at),
        },
        {
            id: 'actions',
            header: t('actions'),
            cell: ({ row }) => (
                <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                    {t('manage')}
                </Button>
            ),
        },
    ]
}
