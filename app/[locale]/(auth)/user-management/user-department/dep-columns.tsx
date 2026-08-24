'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DepartmentType } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

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

export function getDepartmentColumns(t: (key: string) => string, tc: (key: string) => string): ColumnDef<DepartmentType>[] {
  return [
    {
        accessorKey: 'name',
        header: t('columns.name'),
    },
    {
        accessorKey: 'code',
        header: t('columns.code'),
    },
    {
        accessorKey: 'is_active',
        header: t('columns.status'),
        cell: ({ row }) => {
          const isActive = row.original.is_active
          return (
            <div className="flex flex-wrap gap-2 ">
            <Badge variant="secondary" className={isActive ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 gap-2 text-xs' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 gap-2 text-xs'}>
              {isActive ? tc('active') : tc('inactive')}
            </Badge>
            </div>
          )
        }
    },
    {
        accessorKey: 'created_at',
        header: t('columns.createdAt'),
        cell: ({ row }) => {
          const createdAt = row?.original?.created_at
          return (
            <div>
              {createdAt ? formatDateTime(createdAt) : 'N/A'}
            </div>
          )
        }
    },
    {
        accessorKey: 'updated_at',
        header: t('columns.updatedAt'),
        cell: ({ row }) => {
          const updatedAt = row?.original?.updated_at
          return (
            <div>
              {updatedAt ? formatDateTime(updatedAt) : 'N/A'}
            </div>
          )
        }
    },
    {
        id: 'actions',
        accessorKey: 'action',
        header: tc('actions'),
        cell: () => {
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
                <DropdownMenuItem>{tc('edit')}</DropdownMenuItem>
                <DropdownMenuItem>{tc('delete')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
    }
  ]
}
