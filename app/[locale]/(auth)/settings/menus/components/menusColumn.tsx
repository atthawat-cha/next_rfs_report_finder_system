"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export interface MenuRow {
  id: string;
  group_label: string | null;
  catagory_label: string | null;
  menu_label: string | null;
  sub_menu_label: string | null;
  href: string | null;
  icon: string | null;
  sort_order: number | null;
}

function SortOrderCell({ row, onChange }: { row: MenuRow; onChange: (id: string, sortOrder: number) => void }) {
  return (
    <Input
      // Remounts with a fresh defaultValue whenever the row's real sort_order
      // changes (e.g. after a refetch) - uncontrolled instead of syncing via
      // an effect that would just mirror the prop back into local state.
      key={row.sort_order ?? 0}
      type="number"
      className="w-20 h-8"
      defaultValue={row.sort_order ?? 0}
      onBlur={(e) => {
        const parsed = Number(e.target.value);
        if (Number.isFinite(parsed) && parsed !== (row.sort_order ?? 0)) {
          onChange(row.id, parsed);
        }
      }}
    />
  );
}

export function getMenusColumn(
  onEdit: (row: MenuRow) => void,
  onDelete: (row: MenuRow) => void,
  onSortOrderChange: (id: string, sortOrder: number) => void
): ColumnDef<MenuRow>[] {
  return [
    {
      accessorKey: "group_label",
      header: "Group",
    },
    {
      accessorKey: "catagory_label",
      header: "Category",
    },
    {
      accessorKey: "menu_label",
      header: "Menu",
      cell: ({ row }) => row.original.menu_label ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "sub_menu_label",
      header: "Sub-menu",
      cell: ({ row }) => row.original.sub_menu_label ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "href",
      header: "Href",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.href ?? "—"}</span>,
    },
    {
      accessorKey: "sort_order",
      header: "Sort",
      cell: ({ row }) => <SortOrderCell row={row.original} onChange={onSortOrderChange} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const menu = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(menu)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(menu)} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
