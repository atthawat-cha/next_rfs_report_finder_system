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

async function addToFavorites(reportId: string) {
    try {
        const res = await fetch('/api/reports/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ report_id: reportId }),
        })
        if (!res.ok) {
            toast.error('เพิ่มรายการโปรดไม่สำเร็จ')
            return
        }
        toast.success('เพิ่มเป็นรายการโปรดแล้ว')
    } catch (error) {
        console.error('Error adding favorite:', error)
        toast.error('เพิ่มรายการโปรดไม่สำเร็จ')
    }
}

export function getReportColumn(
    onPreview: (reportId: string) => void,
    onManagePermissions: (reportId: string) => void
): ColumnDef<ReportGetDataType>[] {
    return [
    {
        accessorKey: 'code',
        header: 'รหัส',
    },
    {
        accessorKey: 'name_th',
        header: 'ชื่อ',
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
        header: 'คำอธิบาย',
    },
    {
        accessorKey: 'department',
        header: 'แผนก',
    },
    {
        accessorKey: 'status',
        header: 'สถานะ',
    },
    {
        accessorKey: 'version',
        header: 'เวอร์ชัน',
    },
    {
        accessorKey: 'created_at',
        header: 'วันที่สร้าง',
        cell: ({ row }) => {
            const createdAt = row.original.created_at
            return <div>{createdAt ? formatDateTime(createdAt) : 'ไม่มีข้อมูล'}</div>
        },
    },
    {
        id: 'actions',
        accessorKey: 'action',
        header: 'การจัดการ',
        cell: ({ row }) => {
            const id = row.original.id
            if (!id) return null
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
                        <DropdownMenuItem asChild>
                            <a href={`/reports/report-detail/${id}`}>ดู</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={`/reports/report-edit/${id}`}>แก้ไข</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPreview(id)}>
                            ดูตัวอย่าง
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={`/api/reports/${id}/download`}>ดาวน์โหลด</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onManagePermissions(id)}>
                            สิทธิ์การใช้งาน
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addToFavorites(id)}>
                            เพิ่มในรายการโปรด
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    }
    ]
}