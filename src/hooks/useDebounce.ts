import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set a timer to update the value after 'delay' ms
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // If the user types again before the timer finishes, clear it
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}