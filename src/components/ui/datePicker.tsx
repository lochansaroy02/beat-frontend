"use client"

import { CalendarIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// --- Helper: Format Date Object to YYYY-MM-DD String ---
function formatDateToYYYYMMDD(date: Date | undefined): string {
    if (!date || isNaN(date.getTime())) {
        return ""
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// --- Helper: Parse YYYY-MM-DD String to Date Object (Local Time) ---
function parseYYYYMMDDToDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    // Create date at midnight local time
    return new Date(y, m - 1, d);
}

interface DateProps {
    // Changed: Accept string directly to match parent state
    date: string | undefined;
    setDate: (date: string | undefined) => void;
    label?: string
}

const DatePicker = ({ date, setDate, label }: DateProps) => {
    const [open, setOpen] = React.useState(false)

    // We derive the Date object for the Calendar UI from the incoming string prop
    const parsedDate = React.useMemo(() => parseYYYYMMDDToDate(date), [date]);

    const [month, setMonth] = React.useState<Date | undefined>(parsedDate)
    const [inputValue, setInputValue] = React.useState("")

    // Sync input text when parent prop changes
    React.useEffect(() => {
        setInputValue(date || "")
        if (parsedDate) {
            setMonth(parsedDate)
        }
    }, [date, parsedDate])

    // Handle Manual Input Change (Typing YYYY-MM-DD)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        // Strict Regex for YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (dateRegex.test(newValue)) {
            const newDate = parseYYYYMMDDToDate(newValue);

            // Check if valid date
            if (newDate && !isNaN(newDate.getTime())) {
                setDate(newValue); // Send string to parent
                setMonth(newDate);
            }
        } else if (newValue === "") {
            setDate(undefined);
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            {label && (
                <Label htmlFor="date" className="text-wrap text-sm text-neutral-700">
                    {label}
                </Label>
            )}
            <div className="relative flex gap-2">
                <Input
                    id="date"
                    value={inputValue}
                    placeholder="YYYY-MM-DD"
                    className="text-neutral-800 placeholder:text-neutral-700/50"
                    onChange={handleInputChange}
                    maxLength={10}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                            e.preventDefault()
                            setOpen(true)
                        }
                    }}
                />
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="date-picker"
                            variant="ghost"
                            type="button"
                            className="absolute top-1/2 right-2 size-6 -translate-y-1/2 hover:bg-transparent"
                        >
                            <CalendarIcon className="size-3.5" />
                            <span className="sr-only">Select date</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-auto overflow-hidden p-0 bg-white"
                        align="end"
                        alignOffset={-8}
                        sideOffset={10}
                    >
                        <Calendar
                            mode="single"
                            selected={parsedDate} // Pass Date object to Calendar
                            //@ts-ignore
                            captionLayout="dropdown-buttons"
                            fromYear={1960}
                            toYear={2030}
                            month={month}
                            onMonthChange={setMonth}
                            onSelect={(selectedDate) => {
                                // Convert selected Date object back to string for parent
                                if (selectedDate) {
                                    setDate(formatDateToYYYYMMDD(selectedDate));
                                } else {
                                    setDate(undefined);
                                }
                                setOpen(false)
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}
export default DatePicker