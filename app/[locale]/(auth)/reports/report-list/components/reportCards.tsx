import { ReportGetDataType } from "@/lib/types";
import Image from "next/image";
import { FileText, FileSpreadsheet, File as FileIcon } from "lucide-react";
import { isPdfFile, isSpreadsheetFile } from "@/components/shared/reportFilePreview";

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
// file-type icon instead of a broken/blank thumbnail.
function ReportThumbnail({ report }: { report: ReportGetDataType }) {
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
    const Icon = isSpreadsheetFile(fileNameRef) ? FileSpreadsheet : isPdfFile(fileNameRef) ? FileText : FileIcon;

    return (
        <div className="aspect-square w-full rounded-sm bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <Icon className="h-10 w-10" />
            {extension && <span className="text-xs font-medium">{extension}</span>}
        </div>
    );
}

export default function ReportCardView({ reports }: { reports: ReportGetDataType[] }) {
    return (
        <div className="flex w-full flex-col gap-5">
            <ItemGroup className="grid grid-cols-4 gap-4">
                {reports.map((report) => (
                    <Item key={report.id} variant="outline">
                        <ItemHeader>
                            <ReportThumbnail report={report} />
                        </ItemHeader>
                        <ItemContent>
                            <ItemTitle>{report.name_th}</ItemTitle>
                            <ItemDescription>{report.description}</ItemDescription>
                        </ItemContent>
                    </Item>
                ))}
            </ItemGroup>
        </div>
    )
}