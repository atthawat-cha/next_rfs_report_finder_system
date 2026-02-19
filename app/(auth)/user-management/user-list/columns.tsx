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



export const users_columns: ColumnDef<UserTableType>[] = [
    {
        accessorKey: 'username',
        header: 'Username',
    },
    {
        accessorKey: 'first_name',
        header: 'First Name',
    },
    {
        accessorKey: 'last_name',
        header: 'Last Name',
    },
    {
        accessorKey: 'department_id',
        header: 'Department',    
    },
    {
        accessorKey: 'status',
        header: 'Status',
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
        header: 'Created At',
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
        header: 'Action',
        cell: ({ row }) => {
          const user = row.original.id
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
                {/* <DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.id)}>
                  Copy payment ID
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Detail</DropdownMenuItem>
                <DropdownMenuItem>Modify</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
    }
]