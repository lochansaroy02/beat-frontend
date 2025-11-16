// ThemeSelect.tsx
import {
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Select as UISelect,
} from "@/components/ui/select"
const ThemeSelect = () => {
    return (
        <UISelect >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Case Property" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="light">Case Property</SelectItem>
            </SelectContent>
        </UISelect>
    )
}

export default ThemeSelect
