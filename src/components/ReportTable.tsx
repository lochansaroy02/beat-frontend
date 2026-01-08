"use client";
import { RefreshCw, Search, Sheet, ShieldCheck, Users } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
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
        try {
            // Replace with your actual API call: e.g., const res = await axios.get('/api/report');
            // setPersonData(res.data);
            console.log("Fetching data...");
        } catch (error) {
            console.error("Failed to fetch:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    // Logical Engine: Aggregating stats by unique person per phase
    const { stats, uniqueStations, phaseTotals } = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {};
        const phaseSums: Record<string, number> = {};
        const stationMap = new Map<string, string>();

        // Initialize phase sums
        EIGHT_PHASES.forEach((p) => (phaseSums[p.label] = 0));

        personData.forEach((person) => {
            const rawStation = person.policeStation?.trim() || "Unknown";
            const stationKey = rawStation.toLowerCase();

            if (!stationMap.has(stationKey)) {
                stationMap.set(stationKey, rawStation);
            }

            if (!counts[stationKey]) {
                counts[stationKey] = {};
                EIGHT_PHASES.forEach((p) => (counts[stationKey][p.label] = 0));
            }

            // Check which phases this SPECIFIC person covered
            const coveredPhases = new Set<string>();
            person.qrData?.forEach((scan) => {
                const hour = new Date(scan.scannedOn).getHours();
                const phase = EIGHT_PHASES.find((p) => hour >= p.start && hour < p.end);
                if (phase) coveredPhases.add(phase.label);
            });

            // Increment station count for each unique phase covered by this person
            coveredPhases.forEach((phaseLabel) => {
                counts[stationKey][phaseLabel] += 1;
                phaseSums[phaseLabel] += 1;
            });
        });

        return {
            stats: counts,
            uniqueStations: Array.from(stationMap.values()).sort((a, b) =>
                a.localeCompare(b)
            ),
            phaseTotals: phaseSums,
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
            const row: any = { "POLICE STATION": station.toUpperCase() };
            let stationRowTotal = 0;

            EIGHT_PHASES.forEach((phase) => {
                const count = stats[stationKey]?.[phase.label] || 0;
                row[phase.label] = count;
                stationRowTotal += count;
            });

            row["TOTAL ACTIVE PERSONNEL"] = stationRowTotal;
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Activity");
        XLSX.writeFile(
            workbook,
            `Station_Report_${new Date().toISOString().split("T")[0]}.xlsx`
        );
    };

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-900 font-sans">
            <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <span className="p-2 bg-indigo-600 rounded-lg text-white">
                            <ShieldCheck size={28} />
                        </span>
                        OPERATIONAL LOGS
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Unique personnel activity per 3-hour time block.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-grow md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Filter by station name..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-emerald-100"
                    >
                        <Sheet size={18} /> Export
                    </button>

                    <button
                        onClick={fetchReport}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                        Sync
                    </button>
                </div>
            </div>

            <ReportTable
                phases={EIGHT_PHASES}
                filteredRows={filteredRows}
                isLoading={isLoading}
                stats={stats}
                phaseTotals={phaseTotals}
            />

            {/* Summary Footer Cards */}
            <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Total Force Tracked" value={personData.length} icon={<Users className="text-indigo-600" />} />
                <StatCard label="Active Stations" value={uniqueStations.length} icon={<ShieldCheck className="text-emerald-600" />} />
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-black text-slate-900">{value.toLocaleString()}</p>
        </div>
    </div>
);

const ReportTable = ({ phases, filteredRows, isLoading, stats, phaseTotals }: any) => {
    return (
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-tighter border-b border-slate-200">
                            <th className="p-5 sticky left-0 bg-[#fcfdfe] z-30 border-r border-slate-200 min-w-[220px]">Police Station</th>
                            {phases.map((p: any) => (
                                <th key={p.label} className="p-4 text-center border-r border-slate-100">{p.label}</th>
                            ))}
                            <th className="p-4 text-center bg-indigo-50/50 text-indigo-700">Daily Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <TableSkeleton phases={phases} />
                        ) : (
                            filteredRows.map((station: string) => {
                                const stationKey = station.toLowerCase();
                                let rowTotal = 0;
                                return (
                                    <tr key={station} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-5 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r border-slate-200 capitalize">
                                            {station}
                                        </td>
                                        {phases.map((p: any) => {
                                            const count = stats[stationKey]?.[p.label] || 0;
                                            rowTotal += count;
                                            return (
                                                <td key={p.label} className="p-4 text-center border-r border-slate-50">
                                                    <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${count > 10 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                        count > 5 ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                            count > 0 ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                                                "text-slate-300 border-transparent"
                                                        }`}>
                                                        {count}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 text-center font-black text-slate-900 bg-slate-50/30">
                                            {rowTotal}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        {/* Footer Row for Phase Sums */}
                        {!isLoading && (
                            <tr className="bg-slate-900 text-white font-bold">
                                <td className="p-5 sticky left-0 bg-slate-900 border-r border-slate-700">GRAND TOTALS</td>
                                {phases.map((p: any) => (
                                    <td key={p.label} className="p-4 text-center border-r border-slate-700">
                                        {phaseTotals[p.label]}
                                    </td>
                                ))}
                                <td className="p-4 text-center bg-indigo-600">
                                    {Object.values(phaseTotals).reduce((a: any, b: any) => a + b, 0)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TableSkeleton = ({ phases }: any) => (
    <>
        {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
                <td className="p-5 border-r border-slate-100"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                {phases.map((_: any, j: number) => (
                    <td key={j} className="p-4 border-r border-slate-50"><div className="h-6 bg-slate-50 rounded-lg w-10 mx-auto"></div></td>
                ))}
                <td className="p-4 bg-slate-50/50"><div className="h-4 bg-slate-100 rounded w-8 mx-auto"></div></td>
            </tr>
        ))}
    </>
);

export default ActivityReportPage;