'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { TagRow } from './tagTypes'

export function getTagColumn(
    onEdit: (row: TagRow) => void,
    onDelete: (row: TagRow) => void,
    tc: (key: string) => string
): ColumnDef<TagRow>[] {
    return [
        {
            accessorKey: "name",
            header: tc("name"),
        },
        {
            accessorKey: "slug",
            header: "Slug",
        },
        {
            accessorKey: "description",
            header: tc("description"),
        },
        {
            accessorKey: "created_at",
            header: tc("createdAt"),
            cell: ({ row }) => formatDateTime(row.original.created_at),
        },
        {
            id: "actions",
            header: tc("actions"),
            cell: ({ row }) => {
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">{tc("openMenu")}</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{tc("actions")}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEdit(row.original)}>{tc("edit")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(row.original)}>{tc("delete")}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}
