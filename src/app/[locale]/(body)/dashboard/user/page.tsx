"use client";

import UserTable from "@/components/Table";
import DatePicker from "@/components/ui/datePicker";
import InputComponent from "@/components/ui/InputComponent";
import { useDebounce } from "@/hooks/useDebounce"; // Import the hook from Step 1
import { useAuthStore } from "@/store/authStore";
import { usePersonStore } from "@/store/personStore";
import { useQRstore } from "@/store/qrStore";
import {
    ClipboardList,
    Download,
    FileSpreadsheet,
    LayoutGrid,
    Loader2,
    X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// --- CONSTANTS (Moved outside component to avoid recreation) ---
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

// --- HELPER FUNCTIONS ---
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
        else return scanHour >= phase.startHour && scanHour < phase.endHour;
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

    // Data States
    const [qrDataMap, setQrDataMap] = useState<Map<string, any[]>>(new Map());

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState("");
    // OPTIMIZATION 4: Debounce the search (wait 500ms after typing stops)
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const [startDate, setStartDate] = useState<string | undefined>(undefined);
    const [endDate, setEndDate] = useState<string | undefined>(undefined);
    const [selectedTimePhase, setSelectedTimePhase] = useState<string>("");
    const [selectedPoliceStation, setSelectedPoliceStation] = useState<string>("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Report Data
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [aggregatedData, setAggregatedData] = useState<any[]>([]);

    // --- Data Fetching ---
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

    // OPTIMIZED: Fetch QR Data logic
    useEffect(() => {
        if (personData && personData.length > 0) {
            const fetchAllQrData = async () => {
                const personPnos = personData.map(p => p.pnoNo);
                const pnosToFetch = personPnos.filter(pno => !qrDataMap.has(pno));

                if (pnosToFetch.length === 0) {
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);
                const newQrDataMapEntries: [string, any[]][] = [];
                // Process in chunks or parallel
                await Promise.all(pnosToFetch.map(async (pnoNo) => {
                    try {
                        const response = await getQRData(pnoNo);
                        if (response?.data.success) {
                            newQrDataMapEntries.push([pnoNo, response.data.data]);
                        }
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
        } else {
            setIsLoading(false);
        }
    }, [personData, getQRData]);

    const uniquePoliceStations = useMemo(() => {
        const stations = new Set<string>();
        for (const qrData of qrDataMap.values()) {
            qrData.forEach(item => {
                if (item.policeStation?.trim()) stations.add(item.policeStation.trim());
            });
        }
        return Array.from(stations).sort();
    }, [qrDataMap]);

    // --- OPTIMIZATION 5: Memoized Filtering ---
    // Only recalculate when dependencies change, NOT on every render.
    // Uses debouncedSearchQuery instead of raw searchQuery.
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

        return { filteredData: nextFilteredPersonData, filteredQrDataMap: nextFilteredQrMap };
    }, [personData, qrDataMap, debouncedSearchQuery, selectedTimePhase, selectedPoliceStation, startDate, endDate]);

    // Reset pagination when filter changes
    useEffect(() => { setCurrentPage(1); }, [debouncedSearchQuery, selectedTimePhase, selectedPoliceStation, startDate, endDate]);

    // Get current page items
    const currentItems = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredData.slice().reverse().slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredData, currentPage, itemsPerPage]);

    // --- OPTIMIZATION 6: Non-Blocking Report Generation ---
    const generateReportData = () => {
        setIsGeneratingReport(true);

        // setTimeout pushes this expensive task to the end of the browser's todo list.
        // This allows React to render the "Calculating..." spinner FIRST.
        setTimeout(() => {
            const statsMap = new Map<string, { [key: string]: number }>();
            const selectedPhase = TIME_PHASES.find(p => p.label === selectedTimePhase);

            for (const qrList of filteredQrDataMap.values()) {
                qrList.forEach(item => {
                    if (doesScanMatchFilters(item, selectedPhase, selectedPoliceStation, startDate, endDate)) {
                        const parts = item.scannedOn.split(' ');
                        const timeStr = parts.slice(1).join(' ');
                        const phaseLabel = getTimePhaseLabel(timeStr) || "Unknown";
                        const station = item.policeStation || "Unknown Station";

                        if (!statsMap.has(station)) statsMap.set(station, {});
                        const stationStats = statsMap.get(station)!;
                        stationStats[phaseLabel] = (stationStats[phaseLabel] || 0) + 1;
                    }
                });
            }

            const reportData: any[] = [];
            statsMap.forEach((counts, station) => {
                const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
                reportData.push({ policeStation: station, counts: counts, total: total });
            });

            reportData.sort((a, b) => a.policeStation.localeCompare(b.policeStation));
            setAggregatedData(reportData);

            setIsGeneratingReport(false);
            setIsReportModalOpen(true);
        }, 100);
    };

    const handleDownloadCsv = () => {
        if (aggregatedData.length === 0) return;
        const headerRow = ["Police Station", ...TIME_PHASES.map(p => p.label), "Total Scans"];
        const rows = aggregatedData.map(row => {
            const rowData = [`"${row.policeStation}"`, ...TIME_PHASES.map(phase => row.counts[phase.label] || 0), row.total];
            return rowData.join(",");
        });
        const csvString = [headerRow.join(","), ...rows].join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const filename = `Station_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <div className='w-full p-4 relative'>
            <div className="glass-effect flex justify-between gap-4 px-4 py-4 flex-wrap">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4 ">
                        <DatePicker label="Start Date" date={startDate} setDate={setStartDate} />
                        <DatePicker label="End Date" date={endDate} setDate={setEndDate} />
                    </div>
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium mb-1">Police Station</label>
                            <select
                                value={selectedPoliceStation}
                                onChange={(e) => setSelectedPoliceStation(e.target.value)}
                                className="p-2 border border-gray-300 rounded-md h-10 w-48 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">All Stations</option>
                                {uniquePoliceStations.map((station) => (
                                    <option key={station} value={station}>{station}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium mb-1">Time Phase</label>
                            <select
                                value={selectedTimePhase}
                                onChange={(e) => setSelectedTimePhase(e.target.value)}
                                className="p-2 border border-gray-300 rounded-md h-10 w-48 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">All Times</option>
                                {TIME_PHASES.map((phase) => (
                                    <option key={phase.label} value={phase.label}>{phase.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-center justify-center flex-col">
                    <InputComponent
                        customPlaceholder="Search"
                        value={searchQuery}
                        setInput={setSearchQuery} // We update this immediately for the input field...
                        placeholder="Search by name or PNO..."
                    />

                    <button
                        onClick={generateReportData}
                        disabled={isGeneratingReport}
                        className={`p-2 flex items-center px-4 gap-2 text-white rounded-md transition-colors self-end shadow-md ${isGeneratingReport ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isGeneratingReport ? <Loader2 className="animate-spin" size={18} /> : <ClipboardList size={18} />}
                        <span className="text-sm font-medium">
                            {isGeneratingReport ? "Calculating..." : "Generate  Report"}
                        </span>
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center my-4">
                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 bg-gray-200 rounded disabled:opacity-50 text-sm">Previous</button>
                <span className="text-sm">Page {currentPage} of {Math.ceil((filteredData ? filteredData.length : 0) / itemsPerPage)}</span>
                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === Math.ceil((filteredData ? filteredData.length : 0) / itemsPerPage)} className="p-2 bg-gray-200 rounded disabled:opacity-50 text-sm">Next</button>
            </div>

            {/* OPTIMIZATION 7: useCallback for prop function */}
            <UserTable
                personData={currentItems}
                qrDataMap={filteredQrDataMap}
                isLoading={isLoading}
                onEditUser={useCallback(() => { }, [])}
            />

            <div className="flex justify-between items-center my-4">
                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 bg-gray-200 rounded disabled:opacity-50 text-sm">Previous</button>
                <span className="text-sm">Page {currentPage}</span>
                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === Math.ceil((filteredData ? filteredData.length : 0) / itemsPerPage)} className="p-2 bg-gray-200 rounded disabled:opacity-50 text-sm">Next</button>
            </div>

            {/* REPORT MODAL */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <LayoutGrid className="text-blue-700" size={28} />
                                    Station Activity Matrix
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Scan counts by Police Station vs Time Slot</p>
                            </div>
                            <button onClick={() => setIsReportModalOpen(false)} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-auto bg-white">
                            {aggregatedData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <FileSpreadsheet size={48} className="mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No records found matching filters.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 font-semibold border-b sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 border-r bg-gray-200 min-w-[200px] sticky left-0 z-20">Police Station</th>
                                            {TIME_PHASES.map((phase) => (
                                                <th key={phase.label} className="px-2 py-3 text-center border-r min-w-[120px] whitespace-normal text-xs">{phase.label.replace("Phase", "Ph")}</th>
                                            ))}
                                            <th className="px-4 py-3 text-center bg-blue-50 font-bold min-w-[80px]">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {aggregatedData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                                <td className="px-4 py-2 font-medium text-gray-900 border-r bg-gray-50 sticky left-0 z-10">{row.policeStation}</td>
                                                {TIME_PHASES.map((phase) => {
                                                    const count = row.counts[phase.label] || 0;
                                                    return (
                                                        <td key={phase.label} className={`px-2 py-2 text-center border-r ${count > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'}`}>
                                                            {count > 0 ? count : "-"}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-2 text-center font-bold text-blue-700 bg-blue-50/50">{row.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsReportModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300 bg-white">Close</button>
                            <button onClick={handleDownloadCsv} disabled={aggregatedData.length === 0} className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
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