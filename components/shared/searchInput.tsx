import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Search } from "lucide-react"

type Prop = {
    onSearch: (search: string) => void;
    countRes: string;
    defaultValue?: string;
}

export function SearchInput({ onSearch, countRes, defaultValue }: Prop) {
    return (
        <InputGroup className="max-w-xs">
            <InputGroupInput
                placeholder="ค้นหา..."
                defaultValue={defaultValue}
                onChange={(e) => onSearch(e.target.value)}
            />
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">{countRes} รายการ</InputGroupAddon>
        </InputGroup>
    )
}
