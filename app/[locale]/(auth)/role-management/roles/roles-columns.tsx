"use client";
import { ColumnDef } from "@tanstack/react-table";
import { RolesTableType } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function getRolesColumns(t: (key: string) => string): ColumnDef<RolesTableType>[] {
  return [
  {
    accessorKey: "name",
    header: t("code"),
  },
  {
    accessorKey: "display_name",
    header: t("displayName"),
  },
  {
    accessorKey: "count",
    header: t("users"),
    cell: ({ row }) => {
      const count = row?.original?._count?.users || 0;
      return <span >{count}</span>;
    }
  },
  {
    accessorKey: "created_at",
    header: t("created"),
    cell: ({ row }) => {
      return formatDateTime(row.getValue("created_at"));
    },
  },
  {
    id: "actions",
    accessorKey: "action",
    header: t("actions"),
    cell: () => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t("actions")}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={'/role-management/manage'}>{t("modify")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>{t("delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  ];
}
