import { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { TagsType } from '@/lib/types'


export const tagsColumn: ColumnDef<TagsType>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "slug",
        header: "Slug",
    },
    {
        accessorKey: "description",
        header: "Description",
    },
    {
        accessorKey: "created_at",
        header: "Created At",
    },
    {
        accessorKey: "updated_at",
        header: "Updated At",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const tags = row.original
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
                        <DropdownMenuItem // onClick={() => navigator.clipboard.writeText(category.id)}
                        >
                            Copy category ID
                        </DropdownMenuItem>
                        <DropdownMenuItem>View category</DropdownMenuItem>
                        <DropdownMenuItem>Edit category</DropdownMenuItem>
                        <DropdownMenuItem>Delete category</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]