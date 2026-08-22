'use client'
import { ColumnDef } from '@tanstack/react-table'
import { formatDateTime } from '@/lib/utils'
import { PriorityBadge, StatusBadge } from './ticketBadges'
import type { TicketRow } from './ticketTypes'

export const myTicketColumns: ColumnDef<TicketRow>[] = [
    {
        accessorKey: 'ticket_number',
        header: 'Ticket #',
    },
    {
        accessorKey: 'subject',
        header: 'Subject',
    },
    {
        accessorKey: 'category',
        header: 'Category',
    },
    {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
        accessorKey: 'created_at',
        header: 'Created At',
        cell: ({ row }) => formatDateTime(row.original.created_at),
    },
]
