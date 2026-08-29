"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ReportGetDataType } from "@/lib/types";
import Image from "next/image";
import { Eye, Printer, Download, Star } from "lucide-react";
import { fileKindMeta, ReportStatusPill, AccessLockIcon, categoryAccent } from "@/components/shared/reportDisplayMeta";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

function isImageFile(file: { file_name?: string }): boolean {
    const name = file.file_name?.toLowerCase() ?? "";
    return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
}

interface FavReportCardViewProps {
    reports: ReportGetDataType[];
    onUnfavorite: (reportId: string) => void;
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
                    src={`${report.file_path}`}
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
    const canPreview = isPdf && report.is_downloadable && Boolean(report.id);

    return (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-muted/50 p-4">
            <CardAccentBar accent={accent} />
            {/* Mock document face - no server-side PDF/XLSX-to-image rendering
                exists in this system (see CLAUDE.md §Download/Export/Print),
                same convention as report-list/components/reportCards.tsx. */}
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

export default function FavReportCardView({ reports, onUnfavorite }: FavReportCardViewProps) {
    const t = useTranslations("reports.previewDialog");
    const tl = useTranslations("reports.list");
    const tf = useTranslations("reports.favorites");
    const [previewReport, setPreviewReport] = React.useState<ReportGetDataType | null>(null);

    return (
        <div className="flex w-full flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {reports.map((report) => {
                    const tags = report.report_tags ?? [];
                    return (
                        <div
                            key={report.id}
                            className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                        >
                            <ReportThumbnail report={report} onPreview={() => setPreviewReport(report)} />

                            <div className="flex flex-1 flex-col gap-2 p-3.5">
                                <div className="flex items-start justify-between gap-2">
                                    <Link
                                        href={`/reports/report-detail/${report.id}`}
                                        className="line-clamp-2 text-sm font-semibold leading-snug hover:underline"
                                    >
                                        {report.name_th}
                                    </Link>
                                    {/* Every report here is already a favorite, so the star is
                                        always filled - clicking it removes it (same action as the
                                        table view's "Remove from Favorites" menu item), not a
                                        toggle. */}
                                    <button
                                        type="button"
                                        onClick={() => report.id && onUnfavorite(report.id)}
                                        aria-label={tf("removeFromFavorites")}
                                        className="shrink-0 rounded-full p-0.5 text-amber-500 transition-colors hover:text-amber-600"
                                    >
                                        <Star className="h-4 w-4 fill-current" />
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

            <Dialog open={previewReport !== null} onOpenChange={(open) => !open && setPreviewReport(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{previewReport?.name_th}</DialogTitle>
                        <DialogDescription>{previewReport?.description}</DialogDescription>
                    </DialogHeader>

                    {previewReport && (
                        <embed
                            src={`/api/reports/${previewReport.id}/download?disposition=inline`}
                            type="application/pdf"
                            className="w-full h-[60vh] flex-1"
                        />
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => window.print()}>
                            <Printer className="h-4 w-4 mr-2" /> {t("print")}
                        </Button>
                        <Button asChild>
                            <a href={`/api/reports/${previewReport?.id}/download`} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4 mr-2" /> {t("download")}
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
