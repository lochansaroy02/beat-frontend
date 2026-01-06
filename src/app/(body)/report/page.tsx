"use client";
import Filter, { TIME_PHASES } from "@/components/Filter";
import { useAuthStore } from "@/store/authStore";
import { usePersonStore } from "@/store/personStore";
import { useQRstore } from "@/store/qrStore";
import { doesScanMatchFilters } from "@/utils/funtions";
import { useEffect, useMemo, useState } from "react";

const page = () => {
    const { personData, getPerson } = usePersonStore();
    const { getQRData } = useQRstore();
    const { userData, isInitialized, initializeStore } = useAuthStore();

    // --- Filter States ---
    const [startDate, setStartDate] = useState<string | undefined>(undefined);
    const [endDate, setEndDate] = useState<string | undefined>(undefined);
    const [selectedTimePhase, setSelectedTimePhase] = useState<string>("");
    const [selectedPoliceStation, setSelectedPoliceStation] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    // --- Data States ---
    const [qrDataMap, setQrDataMap] = useState<Map<string, any[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { initializeStore(); }, [initializeStore]);

    // Initial Person Data Fetch
    useEffect(() => {
        if (isInitialized && userData?.id) {
            getPerson(userData.id);
        }
    }, [isInitialized, userData?.id, getPerson]);

    // Fetch all QR scan logs for the department
    useEffect(() => {
        if (personData && personData.length > 0) {
            const fetchAllQrData = async () => {
                const pnosToFetch = personData.map(p => p.pnoNo).filter(pno => !qrDataMap.has(pno));
                if (pnosToFetch.length === 0) { setIsLoading(false); return; }

                setIsLoading(true);
                const newEntries: [string, any[]][] = [];
                await Promise.all(pnosToFetch.map(async (pnoNo) => {
                    try {
                        const response = await getQRData(pnoNo);
                        if (response?.data.success) newEntries.push([pnoNo, response.data.data]);
                    } catch (e) { console.error(e); }
                }));

                setQrDataMap(prev => {
                    const next = new Map(prev);
                    newEntries.forEach(([k, v]) => next.set(k, v));
                    return next;
                });
                setIsLoading(false);
            };
            fetchAllQrData();
        }
    }, [personData]);

    const uniquePoliceStations = useMemo(() => {
        const stations = new Set<string>();
        qrDataMap.forEach(scans => scans.forEach(s => {
            if (s.policeStation) stations.add(s.policeStation);
        }));
        return Array.from(stations).sort();
    }, [qrDataMap]);

    // --- Core Logic: Aggregating counts for the table ---
    const processedData = useMemo(() => {
        const stats: Record<string, Record<string, number>> = {};
        const selectedPhaseObj = TIME_PHASES.find(p => p.label === selectedTimePhase);

        qrDataMap.forEach((qrList, pnoNo) => {
            const person = personData?.find(p => p.pnoNo === pnoNo);
            // Apply Search filter (name or PNO)
            if (searchQuery && person) {
                const query = searchQuery.toLowerCase();
                if (!person.name.toLowerCase().includes(query) && !person.pnoNo.includes(query)) return;
            }

            qrList.forEach(scan => {
                // Apply Filter Logic
                if (doesScanMatchFilters(scan, selectedPhaseObj, selectedPoliceStation, startDate, endDate)) {
                    const psName = scan.policeStation || "Unknown";

                    if (!stats[psName]) {
                        stats[psName] = {};
                        TIME_PHASES.forEach((phase) => (stats[psName][phase.label] = 0));
                    }

                    // Map specific scan time to a phase label
                    const scanDate = new Date(scan.scannedOn); // Assuming scannedOn is ISO string
                    const hour = scanDate.getHours();
                    const currentPhase = TIME_PHASES.find(p => {
                        if (p.startHour === 21 && p.endHour === 24) return hour >= 21 && hour < 24;
                        return hour >= p.startHour && hour < p.endHour;
                    });

                    if (currentPhase) {
                        stats[psName][currentPhase.label] += 1;
                    }
                }
            });
        });

        return stats;
    }, [qrDataMap, selectedTimePhase, selectedPoliceStation, startDate, endDate, searchQuery, personData]);

    const stations = Object.keys(processedData).sort();

    return (
        <div className="p-6 bg-gray-50 min-h-screen space-y-6">
            <Filter
                startDate={startDate} setStartDate={setStartDate}
                endDate={endDate} setEndDate={setEndDate}
                selectedPoliceStation={selectedPoliceStation} setSelectedPoliceStation={setSelectedPoliceStation}
                uniquePoliceStations={uniquePoliceStations}
                selectedTimePhase={selectedTimePhase} setSelectedTimePhase={setSelectedTimePhase}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                onGenerateReport={() => { }} // Not needed here as it's real-time
                isGeneratingReport={isLoading}
            />

            <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Attendance Analysis Report</h1>
                    {isLoading && <span className="text-sm text-blue-600 animate-pulse">Updating data...</span>}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800 text-white">
                                <th className="p-4 text-sm font-semibold sticky left-0 bg-slate-800 z-10">Police Station</th>
                                {TIME_PHASES.map((p) => (
                                    <th key={p.label} className="p-4 text-xs font-semibold uppercase text-center border-l border-slate-700">{p.label}</th>
                                ))}
                                <th className="p-4 text-sm font-semibold bg-slate-900 text-center border-l border-slate-700">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {stations.map((station) => {
                                let rowTotal = 0;
                                return (
                                    <tr key={station} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4 font-medium text-gray-700 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-r">{station}</td>
                                        {TIME_PHASES.map((p) => {
                                            const count = processedData[station][p.label];
                                            rowTotal += count;
                                            return (
                                                <td key={p.label} className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${count > 0 ? "bg-green-100 text-green-700" : "text-gray-400"}`}>
                                                        {count}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 text-center font-bold text-slate-800 bg-gray-50/50">{rowTotal}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default page;