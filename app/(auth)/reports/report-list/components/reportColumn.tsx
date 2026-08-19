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
import toast from 'react-hot-toast'

async function addToFavorites(reportId: string) {
    try {
        const res = await fetch('/api/reports/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ report_id: reportId }),
        })
        if (!res.ok) {
            toast.error('Failed to add favorite')
            return
        }
        toast.success('Added to favorites')
    } catch (error) {
        console.error('Error adding favorite:', error)
        toast.error('Failed to add favorite')
    }
}

export function getReportColumn(onPreview: (reportId: string) => void): ColumnDef<ReportGetDataType>[] {
    return [
    {
        accessorKey: 'code',
        header: 'Code',
    },
    {
        accessorKey: 'name_th',
        header: 'Name',
        cell: ({ row }) => {
            const id = row.original.id
            const name = row.original.name_th
            if (!id) return name
            return (
                <a href={`/reports/report-detail/${id}`} className="text-primary underline-offset-4 hover:underline">
                    {name}
                </a>
            )
        },
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
            const id = row.original.id
            if (!id) return null
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
                        <DropdownMenuItem asChild>
                            <a href={`/reports/report-detail/${id}`}>View</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={`/reports/report-edit/${id}`}>Edit</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPreview(id)}>
                            Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={`/api/reports/${id}/download`}>Download</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addToFavorites(id)}>
                            Add to Favorites
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    }
    ]
}