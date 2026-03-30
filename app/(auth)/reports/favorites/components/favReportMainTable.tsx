
import { ReportGetDataType } from "@/lib/types";
import { FavReportsDataTable } from "./favReportTable";
import { favReportColumn } from "./favReportColumn";

export default function FavReportMainTableView({ reports }: { reports: ReportGetDataType[] }) {
    return (
        <FavReportsDataTable columns={favReportColumn} data={reports} />
    )
}