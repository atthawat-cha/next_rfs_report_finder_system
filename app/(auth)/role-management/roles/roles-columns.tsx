"use client";
import { ColumnDef } from "@tanstack/react-table";
import { DepartmentType, RolesTableType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

export const roles_columns: ColumnDef<RolesTableType>[] = [
  {
    accessorKey: "name",
    header: "Code",
  },
  {
    accessorKey: "display_name",
    header: "Display Name",
  },
  {
    accessorKey: "count",
    header: "Users",
    cell: ({ row }) => {
      console.log(row.original)
      const count = row?.original?._count?.users || 0;
      return <span >{count}</span>;
    }
  },
  // {
  //   accessorKey: "is_active",
  //   header: "Status",
  //   cell: ({ row }) => {
  //     const is_active = row.getValue("is_active");
  //     return <Badge variant={is_active ? "default" : "destructive"}>{is_active ? "Active" : "Inactive"}</Badge>;
  //   },
  // },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      return formatDateTime(row.getValue("created_at"));
    },
  },
  {
    id: "actions",
    accessorKey: "action",
    header: "Actions",
    cell: ({ row }) => {
      const id = row?.original?.id;
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
            <DropdownMenuItem asChild>
              <Link href={'/role-management/manage'}>Modify</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
