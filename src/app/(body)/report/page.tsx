"use client";
import ReportTable from "@/components/ReportTable";
import { Sheet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

const ActivityReportPage = () => {
    const [personData, setPersonData] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchReport = async () => {
        setIsLoading(true);
      
    };

    useEffect(() => {
        fetchReport();
    }, []);

    // Process data into stats and unique station list
    const { stats, uniqueStations } = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {};
        const stationMap = new Map<string, string>(); // To keep the original casing for display

        personData.forEach((person) => {
            // FIX: Normalization to find Kandhala/Kairana regardless of spaces/case
            const rawStation = person.policeStation?.trim() || "Unknown";
            const stationKey = rawStation.toLowerCase();
            // Map the lowercase key to the most common display version
            if (!stationMap.has(stationKey)) {
                stationMap.set(stationKey, rawStation);
            }

            if (!counts[stationKey]) {
                counts[stationKey] = {};
                EIGHT_PHASES.forEach((p) => (counts[stationKey][p.label] = 0));
            }

            person.qrData?.forEach((scan) => {
                const scanDate = new Date(scan.scannedOn);
                const hour = scanDate.getHours();
                const phase = EIGHT_PHASES.find(p => hour >= p.start && hour < p.end);
                if (phase) {
                    counts[stationKey][phase.label] += 1;
                }
            });
        });

        return {
            stats: counts,
            uniqueStations: Array.from(stationMap.values()).sort((a, b) => a.localeCompare(b)),
        };
    }, [personData]);

    const filteredRows = useMemo(() => {
        return uniqueStations.filter((station) =>
            station.toLowerCase().includes(searchQuery.toLowerCase().trim())
        );

    }, [uniqueStations, searchQuery]);


    const exportToExcel = () => {
        const excelData = filteredRows.map((station) => {
            const stationKey = station.toLowerCase();
            const row: any = { "Police Station": station.toUpperCase() };
            let rowTotal = 0;

            EIGHT_PHASES.forEach((phase) => {
                const count = stats[stationKey]?.[phase.label] || 0;
                row[phase.label] = count;
                rowTotal += count;
            });

            row["Grand Total"] = rowTotal;
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Report");

        const wscols = [
            { wch: 25 },
            ...EIGHT_PHASES.map(() => ({ wch: 15 })),
            { wch: 15 }
        ];
        worksheet["!cols"] = wscols;

        const fileName = `Activity_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
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
                            Station Activity
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium">Monitoring QR scan distribution across 24 hours.</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:w-64">
                        <input
                            type="text"
                            placeholder="Search Station (e.g. Kairana)..."
                            className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={exportToExcel}
                        disabled={filteredRows.length === 0 || isLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                    >
                        <span><Sheet /></span>
                        Export Excel
                    </button>

                    <button
                        onClick={fetchReport}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all"
                    >
                        {isLoading ? "Syncing..." : "Refresh Data"}
                    </button>
                </div>
            </div>

            <ReportTable phase={EIGHT_PHASES} filteredRows={filteredRows} isLoading={isLoading} stats={stats} />


            <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Total System Scans</p>
                    <p className="text-3xl font-black text-slate-900 leading-none">
                        {personData.reduce((acc, curr) => acc + (curr.qrData?.length || 0), 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Personnel Tracked</p>
                    <p className="text-3xl font-black text-indigo-600 leading-none">
                        {personData.length}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ActivityReportPage;