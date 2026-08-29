"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { ReportGetDataType } from "@/lib/types";
import Image from "next/image";
import { Eye, Download, Star } from "lucide-react";
import { fileKindMeta, ReportStatusPill, AccessLockIcon, categoryAccent } from "@/components/shared/reportDisplayMeta";
import { cn, formatDateTime } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { ReportPreviewDialog } from "@/components/shared/reportPreviewDialog";

function isImageFile(file: { file_name?: string }): boolean {
    const name = file.file_name?.toLowerCase() ?? "";
    return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
}

interface ReportCardViewProps {
    reports: ReportGetDataType[];
    favoriteIds: Set<string>;
    onToggleFavorite: (reportId: string, next: boolean) => void;
}

function CardAccentBar({ accent }: { accent: string | undefined }) {
    if (!accent) return null;
    return <span className="absolute inset-x-0 top-0 z-10 h-[3px]" style={{ background: accent }} />;
}

function ReportThumbnail({ report, onPreview }: { report: ReportGetDataType; onPreview: () => void }) {
    const t = useTranslations("reports.list.columns");
    const accent = report.categories?.id ? categoryAccent(report.categories.id) : undefined;

    if (isImageFile(report)) {
        return (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-muted">
                <CardAccentBar accent={accent} />
                <Image
                    src={`/api/reports/${report.id}/thumbnail`}
                    alt={report.file_name || ""}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                />
            </div>
        );
    }

    const { ext, Icon, badgeClassName } = fileKindMeta(report);
    const isPdf = ext === "PDF";
    // Preview embeds GET /api/reports/[id]/download?disposition=inline, which
    // enforces is_downloadable server-side regardless - gating the click here
    // too just avoids opening a dialog that can only ever fail.
    const canPreview = isPdf && report.is_downloadable && Boolean(report.id);

    return (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-muted/50 p-4">
            <CardAccentBar accent={accent} />
            {/* Mock document face - there is no server-side PDF/XLSX-to-image
                rendering in this system (see CLAUDE.md §Download/Export/Print),
                so this is a stylized stand-in, not a real page render. */}
            <div className="relative mx-auto flex h-full w-[68%] flex-col gap-1.5 rounded-sm border bg-card p-2.5 shadow-sm">
                <span className={cn("absolute left-2 top-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold", badgeClassName)}>
                    <Icon className="h-2.5 w-2.5" />
                    {ext}
                </span>
                <span className="mt-5 h-1.5 w-3/5 rounded-full bg-muted-foreground/30" />
                <span className="h-1 w-full rounded-full bg-muted-foreground/15" />
                <span className="h-1 w-4/5 rounded-full bg-muted-foreground/15" />
                <span className="h-1 w-full rounded-full bg-muted-foreground/15" />
                <span className="h-1 w-2/3 rounded-full bg-muted-foreground/15" />
            </div>
            {canPreview && (
                <button
                    type="button"
                    onClick={onPreview}
                    className="group absolute inset-0 flex items-center justify-center gap-1.5 bg-background/0 text-sm font-medium opacity-0 transition-all hover:bg-background/80 hover:opacity-100"
                    aria-label={t("preview")}
                >
                    <Eye className="h-4 w-4" />
                    {t("preview")}
                </button>
            )}
        </div>
    );
}

export default function ReportCardView({ reports, favoriteIds, onToggleFavorite }: ReportCardViewProps) {
    const tl = useTranslations("reports.list");
    const tf = useTranslations("reports.favorites");
    const [previewReportId, setPreviewReportId] = React.useState<string | null>(null);

    async function handleToggleFavorite(report: ReportGetDataType) {
        if (!report.id) return;
        const isFav = favoriteIds.has(report.id);
        try {
            const res = await fetch(
                isFav ? `/api/reports/favorites/${report.id}` : "/api/reports/favorites",
                {
                    method: isFav ? "DELETE" : "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: isFav ? undefined : JSON.stringify({ report_id: report.id }),
                }
            );
            if (!res.ok) {
                toast.error(isFav ? tf("removeFailed") : tl("addFavoriteFailed"));
                return;
            }
            toast.success(isFav ? tf("removeSuccess") : tl("addFavoriteSuccess"));
            onToggleFavorite(report.id, !isFav);
        } catch {
            toast.error(isFav ? tf("removeFailed") : tl("addFavoriteFailed"));
        }
    }

    return (
        <div className="flex w-full flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {reports.map((report) => {
                    const isFav = report.id ? favoriteIds.has(report.id) : false;
                    const tags = report.report_tags ?? [];
                    return (
                        <div
                            key={report.id}
                            className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                        >
                            <ReportThumbnail report={report} onPreview={() => setPreviewReportId(report.id ?? null)} />

                            <div className="flex flex-1 flex-col gap-2 p-3.5">
                                <div className="flex items-start justify-between gap-2">
                                    <Link
                                        href={`/reports/report-detail/${report.id}`}
                                        className="line-clamp-2 text-sm font-semibold leading-snug hover:underline"
                                    >
                                        {report.name_th}
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleFavorite(report)}
                                        aria-label={isFav ? tf("removeFromFavorites") : tl("columns.addToFavorites")}
                                        className={cn(
                                            "shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-amber-500",
                                            isFav && "text-amber-500"
                                        )}
                                    >
                                        <Star className={cn("h-4 w-4", isFav && "fill-current")} />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-medium text-foreground/70">
                                        {report.code}
                                    </span>
                                    <span className="truncate">{report.departments?.name ?? tl("columns.noData")}</span>
                                    <AccessLockIcon
                                        access={report.access_level}
                                        titleAccess={tl(`access.${report.access_level}`)}
                                    />
                                </div>

                                <ReportStatusPill status={report.status} label={tl(`status.${report.status}`)} />

                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {tags.slice(0, 2).map(({ tags: tag }) => (
                                            <span key={tag.id} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground/80">
                                                {tag.name}
                                            </span>
                                        ))}
                                        {tags.length > 2 && (
                                            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground/80">
                                                +{tags.length - 2}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="mt-auto flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                                    <span>{report.updated_at ? formatDateTime(report.updated_at, "DD MMM YYYY") : tl("columns.noData")}</span>
                                    <a
                                        href={`/api/reports/${report.id}/download`}
                                        className="rounded p-1 hover:bg-accent hover:text-foreground"
                                        aria-label={tl("columns.download")}
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ReportPreviewDialog
                reportId={previewReportId}
                open={previewReportId !== null}
                onOpenChange={(open) => !open && setPreviewReportId(null)}
            />
        </div>
    );
}
