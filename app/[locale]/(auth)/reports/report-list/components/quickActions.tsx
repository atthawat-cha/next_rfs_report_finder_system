"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, Star, FolderTree, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Admin-only shortcut row (create/manage report metadata) - regular users
 * can only search/preview/download/favorite (see CLAUDE.md's "Users" role),
 * so report-create/categories/tags all 403 for them server-side and are
 * omitted entirely here rather than rendered as dead links.
 */
export default function QuickActions() {
    const t = useTranslations("reports.list.quickActions");

    const tiles = [
        { href: "/reports/report-create", icon: Plus, primary: true, titleKey: "create", subtitleKey: "createSubtitle" },
        { href: "/reports/favorites", icon: Star, primary: false, titleKey: "favorites", subtitleKey: "favoritesSubtitle" },
        { href: "/reports/categories", icon: FolderTree, primary: false, titleKey: "categories", subtitleKey: "categoriesSubtitle" },
        { href: "/reports/tags", icon: Tags, primary: false, titleKey: "tags", subtitleKey: "tagsSubtitle" },
    ] as const;

    return (
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => (
                <Link
                    key={tile.href}
                    href={tile.href}
                    className={cn(
                        "flex items-center gap-3 rounded-xl border p-3.5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md",
                        tile.primary ? "bg-foreground text-background border-foreground" : "bg-card"
                    )}
                >
                    <span
                        className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            tile.primary ? "bg-background/15" : "bg-accent text-foreground/70"
                        )}
                    >
                        <tile.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{t(tile.titleKey)}</span>
                        <span className={cn("block truncate text-[11px]", tile.primary ? "text-background/65" : "text-muted-foreground")}>
                            {t(tile.subtitleKey)}
                        </span>
                    </span>
                </Link>
            ))}
        </div>
    );
}
