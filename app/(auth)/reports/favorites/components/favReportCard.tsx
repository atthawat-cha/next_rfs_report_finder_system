import { ReportGetDataType } from "@/lib/types";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image";

import {
    Item,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemHeader,
    ItemTitle,
} from "@/components/ui/item"

export default function FavReportCardView({ reports }: { reports: ReportGetDataType[] }) {

    const models = reports;
    return (
        <div className="flex w-full  flex-col gap-5">
            <ItemGroup className="grid grid-cols-4 gap-4">
                {models.map((model) => (
                    <Item key={model.id} variant="outline">
                        <ItemHeader>
                            <Image
                                src={`${model.file_path}`}
                                alt={model.file_name || ""}
                                width={128}
                                height={128}
                                className="aspect-square w-full rounded-sm object-cover"
                            />
                        </ItemHeader>
                        <ItemContent>
                            <ItemTitle>{model.name_th}</ItemTitle>
                            <ItemDescription>{model.description}</ItemDescription>
                        </ItemContent>
                    </Item>
                ))}
            </ItemGroup>
        </div>
    )
}   