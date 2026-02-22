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
import { MoreHorizontal } from 'lucide-react'

export const roles_columns: ColumnDef<DepartmentType>[] = [
    {
        accessorKey: 'name',
        header: 'Role Name',
    },
    {
        accessorKey: 'code',
        header: 'Role Code',
    },
    {
        accessorKey: 'is_active',
        header: 'Status',
    },
    {
        accessorKey: 'created_at',
        header: 'Created At',
    },
    {
        accessorKey: 'updated_at',
        header: 'Updated At',
    },
    {
        id: 'actions',
        accessorKey: 'action',
        header: 'Actions',
    },
]