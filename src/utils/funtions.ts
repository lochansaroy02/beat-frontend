import { TIME_PHASES, TimePhase } from "@/components/Filter";

export const getTimePhaseLabel = (timeStr: string): string | null => {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return null;
    const [timePart, ampm] = parts;
    const [hourStr] = timePart.split(':');
    let scanHour = parseInt(hourStr, 10);
    if (isNaN(scanHour)) return null;
    if (ampm === 'PM' && scanHour !== 12) scanHour += 12;
    else if (ampm === 'AM' && scanHour === 12) scanHour = 0;
    const foundPhase = TIME_PHASES.find(phase => {
        if (phase.startHour >= phase.endHour) return scanHour >= phase.startHour || scanHour < phase.endHour;
        return scanHour >= phase.startHour && scanHour < phase.endHour;
    });
    return foundPhase ? foundPhase.label : null;
};

export const doesScanMatchFilters = (item: any, selectedPhase: TimePhase | undefined, selectedStation: string, startDateStr: string | undefined, endDateStr: string | undefined): boolean => {
    if (!item.scannedOn) return false;
    if (selectedStation && item.policeStation !== selectedStation) return false;
    if (selectedPhase) {
        const parts = item.scannedOn.split(' ');
        const timeStr = parts.slice(1).join(' ');
        const phaseLabel = getTimePhaseLabel(timeStr);
        if (phaseLabel !== selectedPhase.label) return false;
    }
    if (startDateStr || endDateStr) {
        const scanDatePart = item.scannedOn.split(' ')[0];
        if (!scanDatePart || !scanDatePart.includes('-')) return false;
        const [day, month, year] = scanDatePart.split('-');
        const scanDateISO = `${year}-${month}-${day}`;
        if (startDateStr && scanDateISO < startDateStr) return false;
        if (endDateStr && scanDateISO > endDateStr) return false;
    }
    return true;
};
/**
 * Converts a UTC ISO string to a local formatted string: YYYY-MM-DD hh:mm AM/PM
 * @param {string} isoString - e.g., "2026-01-05T10:19:35.669Z"
 * @returns {string} - e.g., "2026-01-05 03:49 PM"
 */
export const convertToLocalFormat = (isoString) => {
    if (!isoString) return "N/A";

    const date = new Date(isoString);

    // 1. Get Date components (Local Time)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // 2. Get Time components (Local Time)
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // 3. Determine AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // 4. Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // if hours is 0 (midnight), set to 12
    const strHours = String(hours).padStart(2, '0');

    return `${year}-${month}-${day} ${strHours}:${minutes} ${ampm}`;
};

