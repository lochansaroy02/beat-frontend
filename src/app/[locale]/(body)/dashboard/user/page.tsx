"use client";

import UserTable from "@/components/Table";
import DatePicker from "@/components/ui/datePicker";
import InputComponent from "@/components/ui/InputComponent";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";
import { usePersonStore } from "@/store/personStore";
import { useQRstore } from "@/store/qrStore";
import {
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Download,
    FileSpreadsheet,
    LayoutGrid,
    Loader2,
    X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// --- CONSTANTS ---
interface TimePhase { label: string; startHour: number; endHour: number; }
const TIME_PHASES: TimePhase[] = [
    { label: "Day Phase 1 (6AM - 9AM)", startHour: 6, endHour: 9 },
    { label: "Day Phase 2 (9AM - 12PM)", startHour: 9, endHour: 12 },
    { label: "Day Phase 3 (12PM - 3PM)", startHour: 12, endHour: 15 },
    { label: "Day Phase 4 (3PM - 6PM)", startHour: 15, endHour: 18 },
    { label: "Night Phase 1 (6PM - 9PM)", startHour: 18, endHour: 21 },
    { label: "Night Phase 2 (9PM - 12AM)", startHour: 21, endHour: 0 },
    { label: "Night Phase 3 (12AM - 3AM)", startHour: 0, endHour: 3 },
    { label: "Night Phase 4 (3AM - 6AM)", startHour: 3, endHour: 6 },
];

const getTimePhaseLabel = (timeStr: string): string | null => {
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

const doesScanMatchFilters = (item: any, selectedPhase: TimePhase | undefined, selectedStation: string, startDateStr: string | undefined, endDateStr: string | undefined): boolean => {
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

const Page = () => {
    const { getPerson, personData } = usePersonStore();
    const { getQRData } = useQRstore();
    const { userData, initializeStore, isInitialized } = useAuthStore();

    const [qrDataMap, setQrDataMap] = useState<Map<string, any[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const [startDate, setStartDate] = useState<string | undefined>(undefined);
    const [endDate, setEndDate] = useState<string | undefined>(undefined);
    const [selectedTimePhase, setSelectedTimePhase] = useState<string>("");
    const [selectedPoliceStation, setSelectedPoliceStation] = useState<string>("");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [aggregatedData, setAggregatedData] = useState<any[]>([]);

    const handleGetPersonData = useCallback(async (userId: string | undefined) => {
        if (userId) await getPerson(userId);
        else setIsLoading(false);
    }, [getPerson]);

    useEffect(() => { initializeStore(); }, [initializeStore]);
    useEffect(() => {
        if (isInitialized) {
            if (userData?.id) handleGetPersonData(userData.id);
            else setIsLoading(false);
        }
    }, [isInitialized, userData?.id, handleGetPersonData]);

    useEffect(() => {
        if (personData && personData.length > 0) {
            const fetchAllQrData = async () => {
                const pnosToFetch = personData.map(p => p.pnoNo).filter(pno => !qrDataMap.has(pno));
                if (pnosToFetch.length === 0) { setIsLoading(false); return; }

                setIsLoading(true);
                const newQrDataMapEntries: [string, any[]][] = [];
                await Promise.all(pnosToFetch.map(async (pnoNo) => {
                    try {
                        const response = await getQRData(pnoNo);
                        if (response?.data.success) newQrDataMapEntries.push([pnoNo, response.data.data]);
                    } catch (e) { console.error(e); }
                }));

                setQrDataMap(prev => {
                    const next = new Map(prev);
                    newQrDataMapEntries.forEach(([k, v]) => next.set(k, v));
                    return next;
                });
                setIsLoading(false);
            };
            fetchAllQrData();
        } else { setIsLoading(false); }
    }, [personData, getQRData]);

    const uniquePoliceStations = useMemo(() => {
        const stations = new Set<string>();
        qrDataMap.forEach(qrList => qrList.forEach(item => {
            if (item.policeStation?.trim()) stations.add(item.policeStation.trim());
        }));
        return Array.from(stations).sort();
    }, [qrDataMap]);

    const { filteredData, filteredQrDataMap } = useMemo(() => {
        const selectedPhase = TIME_PHASES.find(p => p.label === selectedTimePhase);
        const needsScanFiltering = selectedTimePhase || selectedPoliceStation || startDate || endDate;

        let nextFilteredPersonData: any[] = [];
        let nextFilteredQrMap = new Map<string, any[]>();

        if (!needsScanFiltering) {
            nextFilteredPersonData = [...(personData || [])];
            nextFilteredQrMap = new Map(qrDataMap);
        } else {
            for (const [pnoNo, qrList] of qrDataMap.entries()) {
                const matchingScans = qrList.filter(item =>
                    doesScanMatchFilters(item, selectedPhase, selectedPoliceStation, startDate, endDate)
                );
                if (matchingScans.length > 0) {
                    nextFilteredQrMap.set(pnoNo, matchingScans);
                    const person = personData?.find(p => p.pnoNo === pnoNo);
                    if (person) nextFilteredPersonData.push(person);
                }
            }
        }

        if (debouncedSearchQuery) {
            const lowerQuery = debouncedSearchQuery.toLocaleLowerCase();
            nextFilteredPersonData = nextFilteredPersonData.filter((item) =>
                item.name.toLocaleLowerCase().includes(lowerQuery) ||
                item.pnoNo.includes(lowerQuery)
            );
        }

        return { filteredData: nextFilteredPersonData.reverse(), filteredQrDataMap: nextFilteredQrMap };
    }, [personData, qrDataMap, debouncedSearchQuery, selectedTimePhase, selectedPoliceStation, startDate, endDate]);

    useEffect(() => { setCurrentPage(1); }, [debouncedSearchQuery, selectedTimePhase, selectedPoliceStation, startDate, endDate]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredData.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredData, currentPage]);

    const generateReportData = () => {
        setIsGeneratingReport(true);
        setTimeout(() => {
            const statsMap = new Map<string, { [key: string]: number }>();
            const selectedPhase = TIME_PHASES.find(p => p.label === selectedTimePhase);

            filteredQrDataMap.forEach(qrList => {
                qrList.forEach(item => {
                    if (doesScanMatchFilters(item, selectedPhase, selectedPoliceStation, startDate, endDate)) {
                        const parts = item.scannedOn.split(' ');
                        const phaseLabel = getTimePhaseLabel(parts.slice(1).join(' ')) || "Unknown";
                        const station = item.policeStation || "Unknown Station";

                        if (!statsMap.has(station)) statsMap.set(station, {});
                        const stationStats = statsMap.get(station)!;
                        stationStats[phaseLabel] = (stationStats[phaseLabel] || 0) + 1;
                    }
                });
            });

            const reportData = Array.from(statsMap.entries()).map(([station, counts]) => ({
                policeStation: station,
                counts,
                total: Object.values(counts).reduce((a, b) => a + b, 0)
            })).sort((a, b) => a.policeStation.localeCompare(b.policeStation));

            setAggregatedData(reportData);
            setIsGeneratingReport(false);
            setIsReportModalOpen(true);
        }, 100);
    };

    const handleDownloadCsv = () => {
        const headerRow = ["Police Station", ...TIME_PHASES.map(p => p.label), "Total Scans"];
        const rows = aggregatedData.map(row => [
            `"${row.policeStation}"`,
            ...TIME_PHASES.map(p => row.counts[p.label] || 0),
            row.total
        ].join(","));
        const blob = new Blob([[headerRow.join(","), ...rows].join("\n")], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className='w-full p-4 space-y-6'>
            {/* Filter Section */}
            <div className="glass-effect flex justify-between gap-4 px-6 py-6 flex-wrap rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <DatePicker label="Start Date" date={startDate} setDate={setStartDate} />
                        <DatePicker label="End Date" date={endDate} setDate={setEndDate} />
                    </div>
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Station</label>
                            <select value={selectedPoliceStation} onChange={(e) => setSelectedPoliceStation(e.target.value)} className="p-2 border rounded-md h-10 w-48 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">All Stations</option>
                                {uniquePoliceStations.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phase</label>
                            <select value={selectedTimePhase} onChange={(e) => setSelectedTimePhase(e.target.value)} className="p-2 border rounded-md h-10 w-48 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">All Times</option>
                                {TIME_PHASES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-end flex-col">
                    <InputComponent customPlaceholder="Search" value={searchQuery} setInput={setSearchQuery} placeholder="Search by name or PNO..." />
                    <button onClick={generateReportData} disabled={isGeneratingReport} className={`p-2 flex items-center px-4 gap-2 text-white rounded-md transition-all shadow-md ${isGeneratingReport ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isGeneratingReport ? <Loader2 className="animate-spin" size={18} /> : <ClipboardList size={18} />}
                        <span className="text-sm font-medium">{isGeneratingReport ? "Processing..." : "Generate Matrix"}</span>
                    </button>
                </div>
            </div>

            {/* Pagination Controls - ONLY ABOVE TABLE */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border rounded-md hover:bg-gray-100 disabled:opacity-50 text-sm font-medium transition-colors">
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border rounded-md hover:bg-gray-100 disabled:opacity-50 text-sm font-medium transition-colors">
                        Next <ChevronRight size={16} />
                    </button>
                </div>
                <div className="text-sm text-gray-600 font-medium">
                    Showing Page <span className="text-blue-600">{currentPage}</span> of {totalPages || 1}
                </div>
            </div>

            <UserTable personData={currentItems} isLoading={isLoading} onEditUser={useCallback(() => { }, [])} />

            {/* REPORT MODAL (Same as before but cleaned up) */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><LayoutGrid className="text-blue-700" size={28} /> Station Activity Matrix</h2>
                                <p className="text-sm text-gray-500 mt-1">Summary of scans by location and time phase</p>
                            </div>
                            <button onClick={() => setIsReportModalOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {aggregatedData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <FileSpreadsheet size={48} className="mb-4 opacity-50" />
                                    <p className="text-lg">No records found matching filters.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 border-b border-r bg-gray-100 sticky left-0 z-20">Police Station</th>
                                            {TIME_PHASES.map(p => <th key={p.label} className="px-2 py-3 text-center border-b border-r text-xs">{p.label}</th>)}
                                            <th className="px-4 py-3 text-center border-b bg-blue-50 font-bold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {aggregatedData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-2 font-medium border-r bg-white sticky left-0 z-10">{row.policeStation}</td>
                                                {TIME_PHASES.map(p => {
                                                    const count = row.counts[p.label] || 0;
                                                    return <td key={p.label} className={`px-2 py-2 text-center border-r ${count > 0 ? 'text-black font-semibold' : 'text-gray-300'}`}>{count || "-"}</td>
                                                })}
                                                <td className="px-4 py-2 text-center font-bold text-blue-700 bg-blue-50/20">{row.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsReportModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-lg bg-white">Close</button>
                            <button onClick={handleDownloadCsv} disabled={aggregatedData.length === 0} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                                <Download size={18} /> Export CSV
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Page;