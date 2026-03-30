import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Search } from "lucide-react"

type Prop = {
    onSearch: (search: string) => void;
    countRes: string;
}

export function SearchInput({ onSearch, countRes }: Prop) {
    return (
        <InputGroup className="max-w-xs">
            <InputGroupInput placeholder="Search..." />
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
        </InputGroup>
    )
}
