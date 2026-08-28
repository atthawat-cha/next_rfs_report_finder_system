"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryTint } from "@/components/shared/reportDisplayMeta";

export interface CategoryFacet {
    id: string;
    name: string;
    count: number;
}

interface CategoryFoldersProps {
    categories: CategoryFacet[];
    selectedId: string;
    onSelect: (id: string) => void;
    isAdmin: boolean;
}

export default function CategoryFolders({ categories, selectedId, onSelect, isAdmin }: CategoryFoldersProps) {
    const t = useTranslations("reports.list");

    if (categories.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-bold">{t("categoriesSectionTitle")}</h2>
                {isAdmin && (
                    <Link href="/reports/categories" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                        {t("manageCategories")}
                    </Link>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {categories.map((category) => {
                    const active = selectedId === category.id;
                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => onSelect(active ? "" : category.id)}
                            className={cn(
                                "flex flex-col items-start gap-2.5 rounded-xl border p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                                active ? "border-foreground bg-accent" : "bg-card"
                            )}
                        >
                            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", categoryTint(category.id))}>
                                <Folder className="h-4 w-4" />
                            </span>
                            <span className="w-full">
                                <span className="block truncate text-xs font-semibold leading-tight">{category.name}</span>
                                <span className="text-[11px] text-muted-foreground">
                                    {t("reportCount", { count: category.count })}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
