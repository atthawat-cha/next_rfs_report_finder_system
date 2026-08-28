

import { ColumnDef } from '@tanstack/react-table'
import { ReportGetDataType } from '@/lib/types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { Link } from '@/i18n/navigation'

export function getFavReportColumn(
    onUnfavorite: (reportId: string) => void,
    onPreview: (reportId: string) => void,
    tList: (key: string) => string,
    tFav: (key: string) => string,
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
        id: 'department',
        header: tList('columns.department'),
        cell: ({ row }) => row.original.departments?.name ?? tList('columns.noData'),
    },
    {
        accessorKey: 'status',
        header: tc('status'),
    },
    {
        accessorKey: 'version',
        header: tList('columns.version'),
    },
    {
        accessorKey: 'created_at',
        header: tc('createdAt'),
        cell: ({ row }) => {
            const createdAt = row.original.created_at
            return <div>{createdAt ? formatDateTime(createdAt) : tList('columns.noData')}</div>
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
                            <Link href={`/reports/report-detail/${id}`}>{tList('columns.view')}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPreview(id)}>
                            {tList('columns.preview')}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={`/api/reports/${id}/download`}>{tList('columns.download')}</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUnfavorite(id)}>
                            {tFav('removeFromFavorites')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    }
    ]
}
