'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { CategoryRow } from './categoryTypes'

export function getCatagoryColumn(
    onEdit: (row: CategoryRow) => void,
    onDelete: (row: CategoryRow) => void
): ColumnDef<CategoryRow>[] {
    return [
        {
            accessorKey: 'code',
            header: 'Code',
        },
        {
            accessorKey: 'name',
            header: 'Name',
        },
        {
            accessorKey: 'description',
            header: 'Description',
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
                    {row.original.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            accessorKey: 'created_at',
            header: 'Created At',
            cell: ({ row }) => formatDateTime(row.original.created_at),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(row.original)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ]
}
