'use client'
import { ColumnDef } from '@tanstack/react-table'
import { ReportGetDataType } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateTime } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'





export const report_column: ColumnDef<ReportGetDataType>[] = [
    {
        accessorKey: 'code',
        header: 'Code',
    },
    {
        accessorKey: 'name_th',
        header: 'Name',
    },
    {
        accessorKey: 'description',
        header: 'description',
    },
    {
        accessorKey: 'department',
        header: 'department',
    },
    {
        accessorKey: 'status',
        header: 'status',
    },
    {
        accessorKey: 'version',
        header: 'version',
    },
    {
        accessorKey: 'create_at',
        header: 'create_at',
    },
    {
        id: 'actions',
        accessorKey: 'action',
        header: 'Actions',
        cell: ({ row }) => {
            const id = row?.original?.id
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
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    }
]