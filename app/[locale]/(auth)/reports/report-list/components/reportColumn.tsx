'use client'
import { ColumnDef } from '@tanstack/react-table'
import { ReportGetDataType } from '@/lib/types'

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateTime } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from '@/i18n/navigation'

async function addToFavorites(reportId: string, t: (key: string) => string) {
    try {
        const res = await fetch('/api/reports/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ report_id: reportId }),
        })
        if (!res.ok) {
            toast.error(t('addFavoriteFailed'))
            return
        }
        toast.success(t('addFavoriteSuccess'))
    } catch (error) {
        console.error('Error adding favorite:', error)
        toast.error(t('addFavoriteFailed'))
    }
}

export function getReportColumn(
    onPreview: (reportId: string) => void,
    onManagePermissions: (reportId: string) => void,
    t: (key: string) => string,
    tc: (key: string) => string
): ColumnDef<ReportGetDataType>[] {
    return [
    {
        accessorKey: 'code',
        header: tc('code'),
    },
    {
        accessorKey: 'name_th',
        header: tc('name'),
        cell: ({ row }) => {
            const id = row.original.id
            const name = row.original.name_th
            if (!id) return name
            return (
                <Link href={`/reports/report-detail/${id}`} className="text-primary underline-offset-4 hover:underline">
                    {name}
                </Link>
            )
        },
    },
    {
        accessorKey: 'description',
        header: tc('description'),
    },
    {
        accessorKey: 'department',
        header: t('columns.department'),
    },
    {
        accessorKey: 'status',
        header: tc('status'),
    },
    {
        accessorKey: 'version',
        header: t('columns.version'),
    },
    {
        accessorKey: 'created_at',
        header: tc('createdAt'),
        cell: ({ row }) => {
            const createdAt = row.original.created_at
            return <div>{createdAt ? formatDateTime(createdAt) : t('columns.noData')}</div>
        },
    },
    {
        id: 'actions',
        accessorKey: 'action',
        header: tc('actions'),
        cell: ({ row }) => {
            const id = row.original.id
            if (!id) return null
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{tc('openMenu')}</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{tc('actions')}</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/reports/report-detail/${id}`}>{t('columns.view')}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/reports/report-edit/${id}`}>{tc('edit')}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPreview(id)}>
                            {t('columns.preview')}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={`/api/reports/${id}/download`}>{t('columns.download')}</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onManagePermissions(id)}>
                            {t('columns.permissions')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addToFavorites(id, t)}>
                            {t('columns.addToFavorites')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    }
    ]
}