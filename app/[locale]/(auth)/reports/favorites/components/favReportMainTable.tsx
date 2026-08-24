"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ReportGetDataType } from "@/lib/types";
import { FavReportsDataTable } from "./favReportTable";
import { getFavReportColumn } from "./favReportColumn";
import { ReportPreviewDialog } from "@/components/shared/reportPreviewDialog";

export default function FavReportMainTableView({ reports, onUnfavorite }: { reports: ReportGetDataType[]; onUnfavorite: (reportId: string) => void }) {
    const [previewId, setPreviewId] = useState<string | null>(null);
    const tList = useTranslations("reports.list");
    const tFav = useTranslations("reports.favorites");
    const tc = useTranslations("common");

    return (
        <>
            <FavReportsDataTable columns={getFavReportColumn(onUnfavorite, setPreviewId, tList, tFav, tc)} data={reports} />
            <ReportPreviewDialog
                reportId={previewId}
                open={previewId !== null}
                onOpenChange={(open) => !open && setPreviewId(null)}
            />
        </>
    )
}
