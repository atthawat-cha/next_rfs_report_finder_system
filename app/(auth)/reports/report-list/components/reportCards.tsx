import { ReportGetDataType } from "@/lib/types";
import Image from "next/image";

import {
    Item,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemHeader,
    ItemTitle,
} from "@/components/ui/item"

export default function ReportCardView({ reports }: { reports: ReportGetDataType[] }) {
    return (
        <div className="flex w-full flex-col gap-5">
            <ItemGroup className="grid grid-cols-4 gap-4">
                {reports.map((report) => (
                    <Item key={report.id} variant="outline">
                        <ItemHeader>
                            <Image
                                src={`${report.file_path}`}
                                alt={report.file_name || ""}
                                width={128}
                                height={128}
                                className="aspect-square w-full rounded-sm object-cover"
                            />
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