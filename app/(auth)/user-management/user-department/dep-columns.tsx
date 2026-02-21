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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateTime } from '@/lib/utils'

export const department_columns: ColumnDef<DepartmentType>[] = [
    {
        accessorKey: 'name',
        header: 'Department Name',
    },
    {
        accessorKey: 'code',
        header: 'Department Code',
    },
    {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => {
          const isActive = row.original.is_active
          return (
            <div className="flex flex-wrap gap-2 ">
            <Badge variant="secondary" className={isActive ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 gap-2 text-xs' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 gap-2 text-xs'}>
              {isActive ? 'Active' : 'Inactive'}    
            </Badge>
            </div>
          )
        }
    },
    {
        accessorKey: 'created_at',
        header: 'Created At',
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
        header: 'Updated At',
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
        cell: ({ row }) => {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <div className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>Edit Department</DropdownMenuItem>
                <DropdownMenuItem>Delete Department</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
    }
]