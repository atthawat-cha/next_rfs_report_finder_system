'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { TagRow } from './tagTypes'

export function getTagColumn(
    onEdit: (row: TagRow) => void,
    onDelete: (row: TagRow) => void
): ColumnDef<TagRow>[] {
    return [
        {
            accessorKey: "name",
            header: "ชื่อ",
        },
        {
            accessorKey: "slug",
            header: "Slug",
        },
        {
            accessorKey: "description",
            header: "คำอธิบาย",
        },
        {
            accessorKey: "created_at",
            header: "วันที่สร้าง",
            cell: ({ row }) => formatDateTime(row.original.created_at),
        },
        {
            id: "actions",
            header: "การจัดการ",
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
            },
        },
    ]
}
