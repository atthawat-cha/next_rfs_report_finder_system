import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"

type Prop = {
    onSearch: (search: string) => void;
    countRes: string;
    defaultValue?: string;
}

export function SearchInput({ onSearch, countRes, defaultValue }: Prop) {
    const tc = useTranslations("common");
    return (
        <InputGroup className="max-w-xs">
            <InputGroupInput
                placeholder={tc("searchPlaceholder")}
                defaultValue={defaultValue}
                onChange={(e) => onSearch(e.target.value)}
            />
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">{tc("resultsCount", { count: countRes })}</InputGroupAddon>
        </InputGroup>
    )
}
