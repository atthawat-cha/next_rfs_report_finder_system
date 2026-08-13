
import { ReportGetDataType } from "@/lib/types";
import { FavReportsDataTable } from "./favReportTable";
import { getFavReportColumn } from "./favReportColumn";

export default function FavReportMainTableView({ reports, onUnfavorite }: { reports: ReportGetDataType[]; onUnfavorite: (reportId: string) => void }) {
    return (
        <FavReportsDataTable columns={getFavReportColumn(onUnfavorite)} data={reports} />
    )
}