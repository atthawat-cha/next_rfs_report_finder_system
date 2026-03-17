import { ReportGetDataType } from "@/lib/types";
import { ReportsDataTable } from "./reportTable";
import { report_column } from "./reportColumn";


export default function ReportTableView({ reports }: { reports: ReportGetDataType[] }) {

    return (
        <ReportsDataTable
            columns={report_column}
            data={reports}
        />
    )
}
