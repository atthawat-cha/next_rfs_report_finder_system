"use client";

import { useState } from "react";
import { ReportGetDataType } from "@/lib/types";
import { FavReportsDataTable } from "./favReportTable";
import { getFavReportColumn } from "./favReportColumn";
import { ReportPreviewDialog } from "@/components/shared/reportPreviewDialog";

export default function FavReportMainTableView({ reports, onUnfavorite }: { reports: ReportGetDataType[]; onUnfavorite: (reportId: string) => void }) {
    const [previewId, setPreviewId] = useState<string | null>(null);

    return (
        <>
            <FavReportsDataTable columns={getFavReportColumn(onUnfavorite, setPreviewId)} data={reports} />
            <ReportPreviewDialog
                reportId={previewId}
                open={previewId !== null}
                onOpenChange={(open) => !open && setPreviewId(null)}
            />
        </>
    )
}
