'use client'
import { ColumnDef } from '@tanstack/react-table'
import { UserTableType } from '@/lib/types'


// Actions
import { BadgeCheck, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

export function getUsersColumns(t: (key: string) => string): ColumnDef<UserTableType>[] {
  return [
    {
        accessorKey: 'username',
        header: t('username'),
    },
    {
        accessorKey: 'first_name',
        header: t('firstName'),
    },
    {
        accessorKey: 'last_name',
        header: t('lastName'),
    },
    {
        accessorKey: 'department_id',
        header: t('department'),
    },
    {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <div className="flex flex-wrap gap-2 ">
            <Badge variant="secondary" className='bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 gap-2 text-xs'>
              <BadgeCheck className='text-xs w-4 h-4' data-icon="inline-start" />
                {status}
            </Badge>
            </div>
          )
        }
    },
    {
        accessorKey: 'created_at',
        header: t('createdAt'),
        cell: ({ row }) => {
          const createdAt = row?.original?.created_at
          return (
            <div className='text-xs text-muted-foreground'>{formatDateTime(createdAt)}</div>
          )
        }
    },
    {
        id:'action',
        accessorKey: 'action',
        header: t('action'),
        cell: () => {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t('action')}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('action')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>{t('viewDetail')}</DropdownMenuItem>
                <DropdownMenuItem>{t('modify')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
    }
  ]
}
