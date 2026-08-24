'use client'
import { ColumnDef } from '@tanstack/react-table'
import { formatDateTime } from '@/lib/utils'
import { PriorityBadge, StatusBadge } from './ticketBadges'
import type { TicketRow } from './ticketTypes'

export function getMyTicketColumns(t: (key: string) => string): ColumnDef<TicketRow>[] {
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
            accessorKey: 'created_at',
            header: t('createdAt'),
            cell: ({ row }) => formatDateTime(row.original.created_at),
        },
    ]
}
