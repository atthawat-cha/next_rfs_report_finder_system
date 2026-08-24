"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ReportGetDataType } from "@/lib/types";
import { ReportsDataTable } from "./reportTable";
import { getReportColumn } from "./reportColumn";
import { ReportPreviewDialog } from "@/components/shared/reportPreviewDialog";
import { ReportPermissionsDrawer } from "@/components/shared/reportPermissionsDrawer";

export default function ReportTableView({ reports }: { reports: ReportGetDataType[] }) {
    const t = useTranslations("reports.list");
    const tc = useTranslations("common");
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [permissionsId, setPermissionsId] = useState<string | null>(null);

    return (
        <>
            <ReportsDataTable
                columns={getReportColumn(setPreviewId, setPermissionsId, t, tc)}
                data={reports}
            />
            <ReportPreviewDialog
                reportId={previewId}
                open={previewId !== null}
                onOpenChange={(open) => !open && setPreviewId(null)}
            />
            <ReportPermissionsDrawer
                reportId={permissionsId}
                open={permissionsId !== null}
                onOpenChange={(open) => !open && setPermissionsId(null)}
            />
        </>
    )
}
