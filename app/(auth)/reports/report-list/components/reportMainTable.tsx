"use client";

import { useState } from "react";
import { ReportGetDataType } from "@/lib/types";
import { ReportsDataTable } from "./reportTable";
import { getReportColumn } from "./reportColumn";
import { ReportPreviewDialog } from "@/components/shared/reportPreviewDialog";

export default function ReportTableView({ reports }: { reports: ReportGetDataType[] }) {
    const [previewId, setPreviewId] = useState<string | null>(null);

    return (
        <>
            <ReportsDataTable
                columns={getReportColumn(setPreviewId)}
                data={reports}
            />
            <ReportPreviewDialog
                reportId={previewId}
                open={previewId !== null}
                onOpenChange={(open) => !open && setPreviewId(null)}
            />
        </>
    )
}
