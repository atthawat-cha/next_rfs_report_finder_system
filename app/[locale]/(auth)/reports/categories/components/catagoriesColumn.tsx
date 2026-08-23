'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { CategoryRow } from './categoryTypes'

export function getCatagoryColumn(
    onEdit: (row: CategoryRow) => void,
    onDelete: (row: CategoryRow) => void
): ColumnDef<CategoryRow>[] {
    return [
        {
            accessorKey: 'code',
            header: 'รหัส',
        },
        {
            accessorKey: 'name',
            header: 'ชื่อ',
        },
        {
            accessorKey: 'description',
            header: 'คำอธิบาย',
        },
        {
            accessorKey: 'is_active',
            header: 'สถานะ',
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
                    {row.original.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                </Badge>
            ),
        },
        {
            accessorKey: 'created_at',
            header: 'วันที่สร้าง',
            cell: ({ row }) => formatDateTime(row.original.created_at),
        },
        {
            id: 'actions',
            header: 'การจัดการ',
            cell: ({ row }) => {
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">เปิดเมนู</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>การจัดการ</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEdit(row.original)}>แก้ไข</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(row.original)}>ลบ</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ]
}
