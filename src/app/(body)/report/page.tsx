"use client";
import { useEffect, useMemo, useState } from "react";
// Import XLSX library
import * as XLSX from "xlsx";

// 8 Phases - 24 Hour Convention
const EIGHT_PHASES = [
    { label: "00:00 - 03:00", start: 0, end: 3 },
    { label: "03:00 - 06:00", start: 3, end: 6 },
    { label: "06:00 - 09:00", start: 6, end: 9 },
    { label: "09:00 - 12:00", start: 9, end: 12 },
    { label: "12:00 - 15:00", start: 12, end: 15 },
    { label: "15:00 - 18:00", start: 15, end: 18 },
    { label: "18:00 - 21:00", start: 18, end: 21 },
    { label: "21:00 - 00:00", start: 21, end: 24 },
];

interface Scan {
    scannedOn: string;
}

interface Person {
    pnoNo: string;
    name: string;
    policeStation: string;
    qrData: Scan[];
}

const Page = () => {
    const [personData, setPersonData] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- Filters State ---
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedStation, setSelectedStation] = useState("All");
    const [selectedPhase, setSelectedPhase] = useState("All");

    const fetchReport = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/qr/get-data`);
            const result = await response.json();
            if (result.success) {
                setPersonData(result.data);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    // 1. Get List of All Stations for the Dropdown (Unfiltered)
    const allStationsList = useMemo(() => {
        const set = new Set<string>();
        personData.forEach(p => set.add(p.policeStation || "Unknown"));
        return Array.from(set).sort();
    }, [personData]);

    // 2. The Core Filtering Logic
    const { processedStats, filteredStationList, totalScans, activePersonnel } = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {};
        const stationSet = new Set<string>();
        let globalScanCount = 0;

        // Date Range Logic Setup
        const start = startDate ? new Date(startDate) : null;
        if (start) start.setHours(0, 0, 0, 0); // Start of day

        const end = endDate ? new Date(endDate) : (startDate ? new Date(startDate) : null);
        if (end) end.setHours(23, 59, 59, 999); // End of day

        // Determine specific phase limits if filter applied
        const targetPhase = selectedPhase !== "All"
            ? EIGHT_PHASES.find(p => p.label === selectedPhase)
            : null;

        personData.forEach((person) => {
            const station = person.policeStation || "Unknown";

            // A. Station Filter
            if (selectedStation !== "All" && station !== selectedStation) {
                return; // Skip this person entirely
            }

            // A2. Text Search Filter (Optional overlay on top of dropdown)
            if (searchQuery && !station.toLowerCase().includes(searchQuery.toLowerCase())) {
                return;
            }

            // Initialize stats structure for this station if not exists
            if (!counts[station]) {
                counts[station] = {};
                EIGHT_PHASES.forEach((p) => (counts[station][p.label] = 0));
            }

            // B. Scan Filtering (Date & Phase)
            let hasValidScans = false;

            person.qrData.forEach((scan) => {
                const scanDateObj = new Date(scan.scannedOn);
                const scanTime = scanDateObj.getTime();

                // 1. Date Check
                if (start && scanTime < start.getTime()) return;
                if (end && scanTime > end.getTime()) return;

                // 2. Phase Check
                const hour = scanDateObj.getHours();

                // Determine which phase this scan belongs to
                const phase = EIGHT_PHASES.find(p => hour >= p.start && hour < p.end);

                if (phase) {
                    // If a specific phase is selected in dropdown, ONLY count if it matches
                    if (targetPhase && targetPhase.label !== phase.label) {
                        return;
                    }

                    // Increment count
                    counts[station][phase.label] += 1;
                    globalScanCount++;
                    hasValidScans = true;
                }
            });

            // Only add station to the list if it matches filters
            // Note: Even if count is 0, if the station matches the station filter, we usually show it.
            // But if we want to show only stations with activity in that date range, check 'hasValidScans'.
            // For now, we show the station row even if counts are 0, as long as it matches Station Filter.
            stationSet.add(station);
        });

        return {
            processedStats: counts,
            filteredStationList: Array.from(stationSet).sort(),
            totalScans: globalScanCount,
            activePersonnel: stationSet.size // Or personData filtered length
        };
    }, [personData, startDate, endDate, selectedStation, selectedPhase, searchQuery]);


    // --- EXPORT FUNCTIONALITY ---
    const exportToExcel = () => {
        const excelData = filteredStationList.map((station) => {
            const row: any = { "Police Station": station.toUpperCase() };
            let rowTotal = 0;

            EIGHT_PHASES.forEach((phase) => {
                const count = processedStats[station][phase.label] || 0;
                row[phase.label] = count;
                rowTotal += count;
            });

            row["Grand Total"] = rowTotal;
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Report");

        const wscols = [
            { wch: 25 },
            ...EIGHT_PHASES.map(() => ({ wch: 15 })),
            { wch: 15 }
        ];
        worksheet["!cols"] = wscols;

        const fileName = `QR_Report_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
            {/* Header & Controls Section */}
            <div className="max-w-7xl mx-auto mb-8 space-y-6">

                {/* Title */}
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
                        QR Activity Report
                    </h1>
                </div>

                {/* Filters Container */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid  md:grid-cols-2 lg:grid-cols-3 gap-4">


                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="text-slate-400 font-bold">-</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate} // Cannot select end date before start date
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Police Station Dropdown */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Police Station</label>
                        <select
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="All">All Stations</option>
                            {allStationsList.map(st => (
                                <option key={st} value={st}>{st}</option>
                            ))}
                        </select>
                    </div>

                    {/* Time Phase Dropdown */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time Phase</label>
                        <select
                            value={selectedPhase}
                            onChange={(e) => setSelectedPhase(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="All">All Phases</option>
                            {EIGHT_PHASES.map(p => (
                                <option key={p.label} value={p.label}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-end gap-2">
                        <button
                            onClick={exportToExcel}
                            disabled={filteredStationList.length === 0}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white p-2.5 rounded-lg font-bold shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export
                        </button>

                        <button
                            onClick={fetchReport}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg font-bold shadow-md shadow-indigo-100 transition-all text-sm"
                        >
                            {isLoading ? "..." : "Sync"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                <th className="p-6 sticky left-0 bg-slate-50 z-30 border-r border-slate-200 min-w-[200px]">Police Station</th>
                                {EIGHT_PHASES.map((p) => (
                                    <th key={p.label} className={`p-4 text-center border-r border-slate-200/60 ${selectedPhase !== "All" && selectedPhase !== p.label ? "opacity-30 bg-slate-100" : ""}`}>
                                        {p.label}
                                    </th>
                                ))}
                                <th className="p-4 text-center bg-indigo-50 text-indigo-700">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!isLoading && filteredStationList.length > 0 ? (
                                filteredStationList.map((station) => {
                                    let stationTotal = 0;
                                    return (
                                        <tr key={station} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-6 font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r border-slate-200 capitalize">
                                                {station}
                                            </td>
                                            {EIGHT_PHASES.map((p) => {
                                                const count = processedStats[station][p.label] || 0;
                                                stationTotal += count;

                                                // Visual dimming if a specific phase is selected and this isn't it
                                                const isDimmed = selectedPhase !== "All" && selectedPhase !== p.label;

                                                return (
                                                    <td key={p.label} className={`p-4 text-center border-r border-slate-200/40 ${isDimmed ? "bg-slate-50" : ""}`}>
                                                        <span className={`inline-flex items-center justify-center min-w-[2.8rem] px-3 py-2 rounded-xl text-xs font-mono font-black border transition-all
                                                            ${isDimmed ? "text-slate-300 border-transparent opacity-50" :
                                                                count >= 15 ? "bg-rose-50 text-rose-600 border-rose-100"
                                                                    : count >= 10 ? "bg-amber-50 text-amber-600 border-amber-100"
                                                                        : count > 0 ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                                            : "text-slate-300 border-transparent"
                                                            }`}>
                                                            {count}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-center font-black text-slate-900 bg-slate-50/50 group-hover:bg-indigo-50/50">
                                                {stationTotal}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                                        No data found matching these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Summary Cards */}
            <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Filtered Scans</p>
                    <p className="text-3xl font-black text-slate-900 leading-none">
                        {totalScans}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Stations Shown</p>
                    <p className="text-3xl font-black text-indigo-600 leading-none">
                        {filteredStationList.length}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Page;