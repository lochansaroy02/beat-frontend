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

const page = () => {
    const [personData, setPersonData] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchReport = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("http://localhost:8080/qr/get-data");
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

    const { stats, uniqueStations } = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {};
        const stationSet = new Set<string>();

        personData.forEach((person) => {
            const station = person.policeStation || "Unknown";
            stationSet.add(station);

            if (!counts[station]) {
                counts[station] = {};
                EIGHT_PHASES.forEach((p) => (counts[station][p.label] = 0));
            }

            person.qrData.forEach((scan) => {
                const scanDate = new Date(scan.scannedOn);
                const hour = scanDate.getHours();
                const phase = EIGHT_PHASES.find(p => hour >= p.start && hour < p.end);
                if (phase) {
                    counts[station][phase.label] += 1;
                }
            });
        });

        return {
            stats: counts,
            uniqueStations: Array.from(stationSet).sort(),
        };
    }, [personData]);

    const filteredRows = useMemo(() => {
        return uniqueStations.filter((station) =>
            station.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [uniqueStations, searchQuery]);

    // --- NEW: EXPORT FUNCTIONALITY ---
    const exportToExcel = () => {
        // 1. Prepare Data for Excel
        const excelData = filteredRows.map((station) => {
            const row: any = { "Police Station": station.toUpperCase() };
            let rowTotal = 0;

            EIGHT_PHASES.forEach((phase) => {
                const count = stats[station][phase.label] || 0;
                row[phase.label] = count;
                rowTotal += count;
            });

            row["Grand Total"] = rowTotal;
            return row;
        });

        // 2. Create worksheet and workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Report");

        // 3. Define column widths for better readability
        const wscols = [
            { wch: 25 }, // Station Name
            ...EIGHT_PHASES.map(() => ({ wch: 15 })),
            { wch: 15 }  // Total
        ];
        worksheet["!cols"] = wscols;

        // 4. Trigger Download
        const fileName = `QR_Activity_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
                            Report
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none flex-grow md:w-64"
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* EXPORT BUTTON */}
                    <button
                        onClick={exportToExcel}
                        disabled={filteredRows.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Excel
                    </button>

                    <button
                        onClick={fetchReport}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                    >
                        {isLoading ? "Syncing" : "Refresh"}
                    </button>
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
                                    <th key={p.label} className="p-4 text-center border-r border-slate-200/60">{p.label}</th>
                                ))}
                                <th className="p-4 text-center bg-indigo-50 text-indigo-700">Grand Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!isLoading && filteredRows.map((station) => {
                                let stationTotal = 0;
                                return (
                                    <tr key={station} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-6 font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r border-slate-200 capitalize">{station}</td>
                                        {EIGHT_PHASES.map((p) => {
                                            const count = stats[station][p.label] || 0;
                                            stationTotal += count;
                                            return (
                                                <td key={p.label} className="p-4 text-center border-r border-slate-200/40">
                                                    <span className={`inline-flex items-center justify-center min-w-[2.8rem] px-3 py-2 rounded-xl text-xs font-mono font-black border ${count >= 15 ? "bg-rose-50 text-rose-600 border-rose-100"
                                                        : count >= 10 ? "bg-amber-50 text-amber-600 border-amber-100"
                                                            : count > 0 ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                                : "text-slate-300 border-transparent"
                                                        }`}>
                                                        {count}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 text-center font-black text-slate-900 bg-slate-50/50 group-hover:bg-indigo-50/50">{stationTotal}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Summary Cards */}
            <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Scans</p>
                    <p className="text-3xl font-black text-slate-900 leading-none">
                        {personData.reduce((acc, curr) => acc + curr.qrData.length, 0)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Active Personnel</p>
                    <p className="text-3xl font-black text-indigo-600 leading-none">
                        {personData.length}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default page;