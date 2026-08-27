"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ReportGetDataType } from "@/lib/types";
import Image from "next/image";
import { FileText, FileSpreadsheet, File as FileIcon, Eye, Printer, Download } from "lucide-react";
import { isPdfFile, isSpreadsheetFile } from "@/components/shared/reportFilePreview";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    Item,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemHeader,
    ItemTitle,
} from "@/components/ui/item"

function isImageFile(file: { file_name?: string }): boolean {
    const name = file.file_name?.toLowerCase() ?? "";
    return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
}

// The report's primary attachment (reports.file_path) is uploaded through
// report-create's "Attachments" field, which accepts pdf/doc/docx/xlsx/xls/
// csv/jpg/jpeg/png (see app/api/reports/report/manage/route.ts) - most
// reports attach a PDF or spreadsheet, not an image. next/image's <Image>
// can only rasterize actual image formats, so pointing it at a PDF/Excel
// file silently rendered nothing. Non-image files now get a recognizable
// file-type icon instead of a broken/blank thumbnail, and a PDF attachment
// is clickable to open a real inline preview.
function ReportThumbnail({ report, onPreview }: { report: ReportGetDataType; onPreview: () => void }) {
    const t = useTranslations("reports.list.columns");

    if (isImageFile(report)) {
        return (
            <Image
                src={`${report.file_path}`}
                alt={report.file_name || ""}
                width={128}
                height={128}
                className="aspect-square w-full rounded-sm object-cover"
            />
        );
    }

    const fileNameRef = { file_name: report.file_name ?? "" };
    const extension = report.file_name?.split(".").pop()?.toUpperCase() ?? "";
    const pdf = isPdfFile(fileNameRef);
    const Icon = isSpreadsheetFile(fileNameRef) ? FileSpreadsheet : pdf ? FileText : FileIcon;
    // The download route (which the preview embeds) enforces is_downloadable
    // server-side regardless - gating the click here too just avoids opening
    // a dialog that can only ever fail.
    const canPreview = pdf && report.is_downloadable && Boolean(report.id);

    return (
        <div
            className={cn(
                "group relative aspect-square w-full rounded-sm bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground",
                canPreview && "cursor-pointer"
            )}
            onClick={canPreview ? onPreview : undefined}
            role={canPreview ? "button" : undefined}
            aria-label={canPreview ? t("preview") : undefined}
        >
            <Icon className="h-10 w-10" />
            {extension && <span className="text-xs font-medium">{extension}</span>}
            {canPreview && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-sm bg-background/80 opacity-0 transition-opacity group-hover:opacity-100">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-medium">{t("preview")}</span>
                </div>
            )}
        </div>
    );
}

export default function ReportCardView({ reports }: { reports: ReportGetDataType[] }) {
    const t = useTranslations("reports.previewDialog");
    const [previewReport, setPreviewReport] = React.useState<ReportGetDataType | null>(null);

    return (
        <div className="flex w-full flex-col gap-5">
            <ItemGroup className="grid grid-cols-4 gap-4">
                {reports.map((report) => (
                    <Item key={report.id} variant="outline">
                        <ItemHeader>
                            <ReportThumbnail report={report} onPreview={() => setPreviewReport(report)} />
                        </ItemHeader>
                        <ItemContent>
                            <ItemTitle>{report.name_th}</ItemTitle>
                            <ItemDescription>{report.description}</ItemDescription>
                        </ItemContent>
                    </Item>
                ))}
            </ItemGroup>

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
    )
}
