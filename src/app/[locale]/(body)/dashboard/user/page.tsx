"use client";

import UserTable from "@/components/Table";
import DatePicker from "@/components/ui/datePicker";
import InputComponent from "@/components/ui/InputComponent";
import { useAuthStore } from "@/store/authStore";
import { usePersonStore } from "@/store/personStore";
import { useQRstore } from "@/store/qrStore";
import { Person, QRDataItem } from "@/types/type";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// --- Utility Definitions ---
interface TimePhase {
    label: string;
    startHour: number;
    endHour: number;
}

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

interface ScanSummaryRow {
    policeStation: string;
    totalScans: number;
    [key: string]: string | number;
}

const convertToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = data.map(row =>
        headers.map(header => {
            let value = row[header] === undefined || row[header] === null ? '' : String(row[header]);
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );
    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
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

const getTimePhaseLabel = (timeStr: string): string | null => {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return null;
    const [timePart, ampm] = parts;
    const [hourStr] = timePart.split(':');
    let scanHour = parseInt(hourStr, 10);
    if (isNaN(scanHour)) return null;

    if (ampm === 'PM' && scanHour !== 12) {
        scanHour += 12;
    } else if (ampm === 'AM' && scanHour === 12) {
        scanHour = 0;
    }

    const foundPhase = TIME_PHASES.find(phase => {
        if (phase.startHour >= phase.endHour) {
            return scanHour >= phase.startHour || scanHour < phase.endHour;
        } else {
            return scanHour >= phase.startHour && scanHour < phase.endHour;
        }
    });
    return foundPhase ? foundPhase.label : null;
};

// --- Filter Logic Helper ---
const doesScanMatchFilters = (
    item: QRDataItem,
    selectedPhase: TimePhase | undefined,
    selectedStation: string,
    startDateStr: string | undefined,
    endDateStr: string | undefined
): boolean => {
    if (!item.scannedOn) return false;

    // 1. Station Match
    if (selectedStation && item.policeStation !== selectedStation) return false;

    // 2. Time Phase Match
    if (selectedPhase) {
        const parts = item.scannedOn.split(' ');
        // Join the rest in case of multiple spaces, though usually it's "11:27 PM"
        const timeStr = parts.slice(1).join(' ');
        const phaseLabel = getTimePhaseLabel(timeStr);
        if (phaseLabel !== selectedPhase.label) return false;
    }

    // 3. Date Match
    // item.scannedOn format: "19-11-2025 11:27 PM" (DD-MM-YYYY)
    // startDateStr / endDateStr format: "2025-11-19" (YYYY-MM-DD)
    if (startDateStr || endDateStr) {
        const scanDatePart = item.scannedOn.split(' ')[0]; // Extracts "19-11-2025"
        if (!scanDatePart || !scanDatePart.includes('-')) return false;

        const [day, month, year] = scanDatePart.split('-');

        // Reconstruct to YYYY-MM-DD for accurate string comparison
        const scanDateISO = `${year}-${month}-${day}`;

        if (startDateStr && scanDateISO < startDateStr) return false;
        if (endDateStr && scanDateISO > endDateStr) return false;
    }

    return true;
};

// -----------------------------------------------------------

const Page = () => {
    const { getPerson, personData } = usePersonStore();
    const { getQRData } = useQRstore();
    const { userData, initializeStore, isInitialized } = useAuthStore();

    // Data States
    const [filteredData, setFilteredData] = useState<Person[]>(personData);
    const [qrDataMap, setQrDataMap] = useState<Map<string, QRDataItem[]>>(new Map());
    const [filteredQrDataMap, setFilteredQrDataMap] = useState<Map<string, QRDataItem[]>>(new Map());

    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Dates should be YYYY-MM-DD strings coming from DatePicker
    const [startDate, setStartDate] = useState<string | undefined>(undefined);
    const [endDate, setEndDate] = useState<string | undefined>(undefined);

    const [selectedTimePhase, setSelectedTimePhase] = useState<string>("");
    const [selectedPoliceStation, setSelectedPoliceStation] = useState<string>("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Report Modal State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState<ScanSummaryRow[]>([]);

    // Edit States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<Person | null>(null);

    const handleEdit = (person: Person) => {
        setUserToEdit(person);
        setIsEditModalOpen(true);
    };

    const handleGetPersonData = useCallback(async (userId: string | undefined) => {
        if (userId) {
            await getPerson(userId);
        } else {
            setIsLoading(false);
        }
    }, [getPerson]);

    useEffect(() => {
        initializeStore();
    }, [initializeStore]);

    useEffect(() => {
        if (isInitialized) {
            if (userData?.id) {
                handleGetPersonData(userData.id);
            } else {
                setIsLoading(false);
            }
        }
    }, [isInitialized, userData?.id, handleGetPersonData]);

    useEffect(() => {
        setFilteredData(personData);
    }, [personData]);

    // --- QR Data Fetching ---
    const fetchQRDataForPerson = useCallback(async (pnoNumber: string): Promise<QRDataItem[]> => {
        try {
            const response = await getQRData(pnoNumber);
            if (response?.data.success) return response.data.data;
            return [];
        } catch (error) {
            return [];
        }
    }, [getQRData]);

    useEffect(() => {
        if (personData && personData.length > 0) {
            const fetchAllQrData = async () => {
                const personPnos = personData.map(p => p.pnoNo);
                const pnosToFetch = personPnos.filter(pno => !qrDataMap.has(pno));

                if (pnosToFetch.length === 0 && personData.length === qrDataMap.size) {
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);
                const newQrDataMapEntries: [string, QRDataItem[]][] = [];
                const fetchPromises = pnosToFetch.map(async (pnoNo) => {
                    const data = await fetchQRDataForPerson(pnoNo);
                    newQrDataMapEntries.push([pnoNo, data]);
                });

                await Promise.all(fetchPromises);

                setQrDataMap(prevMap => {
                    const updatedMap = new Map(prevMap);
                    newQrDataMapEntries.forEach(([pnoNo, data]) => updatedMap.set(pnoNo, data));
                    return updatedMap;
                });
                setIsLoading(false);
            };
            fetchAllQrData();
        } else if (personData && personData.length === 0) {
            setIsLoading(false);
        }
    }, [personData, fetchQRDataForPerson]);


    const uniquePoliceStations = useMemo(() => {
        const stations = new Set<string>();
        for (const qrData of qrDataMap.values()) {
            qrData.forEach(item => {
                if (item.policeStation?.trim()) stations.add(item.policeStation.trim());
            });
        }
        return Array.from(stations).sort();
    }, [qrDataMap]);

    // --- Updated Filtering Logic ---
    const applyFilters = useCallback(() => {
        const selectedPhase = TIME_PHASES.find(p => p.label === selectedTimePhase);

        // Check if any filter is active
        const needsScanFiltering = selectedTimePhase || selectedPoliceStation || startDate || endDate;

        let nextFilteredPersonData: Person[] = [];
        let nextFilteredQrMap = new Map<string, QRDataItem[]>();

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
                    if (person) {
                        nextFilteredPersonData.push(person);
                    }
                }
            }
        }

        if (searchQuery) {
            nextFilteredPersonData = nextFilteredPersonData.filter((item) =>
                item.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
                item.pnoNo.includes(searchQuery)
            );
        }

        setFilteredData(nextFilteredPersonData);
        setFilteredQrDataMap(nextFilteredQrMap);
        setCurrentPage(1);

    }, [personData, qrDataMap, searchQuery, selectedTimePhase, selectedPoliceStation, startDate, endDate]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    // --- Pagination ---
    const totalItems = filteredData ? filteredData.length : 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = useMemo(() => {
        return filteredData ? filteredData.slice().reverse().slice(indexOfFirstItem, indexOfLastItem) : [];
    }, [filteredData, indexOfFirstItem, indexOfLastItem]);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const paginationControls = (
        <div className="flex justify-between items-center my-4">
            <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 bg-gray-200 rounded disabled:opacity-50 text-sm"
            >
                Previous
            </button>
            <span className="text-sm">
                Page {currentPage} of {totalPages || 1} (Total: {totalItems})
            </span>
            <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages || totalItems === 0}
                className="p-2 bg-gray-200 rounded disabled:opacity-50 text-sm"
            >
                Next
            </button>
        </div>
    );

    // --- Report Generation ---
    const generateReportData = () => {
        const stationPhaseCounts = new Map<string, Map<string, number>>();
        const allStations = new Set<string>();

        const selectedPhase = TIME_PHASES.find(p => p.label === selectedTimePhase);

        for (const [, qrData] of filteredQrDataMap.entries()) {
            qrData.forEach(item => {
                // Re-check filters to ensure consistency
                if (doesScanMatchFilters(item, selectedPhase, selectedPoliceStation, startDate, endDate)) {
                    const station = item.policeStation;
                    const parts = item.scannedOn.split(' ');
                    const timeStr = parts.slice(1).join(' ');
                    const phaseLabel = getTimePhaseLabel(timeStr);

                    if (station && phaseLabel) {
                        allStations.add(station);
                        if (!stationPhaseCounts.has(station)) {
                            stationPhaseCounts.set(station, new Map());
                        }
                        const phaseCounts = stationPhaseCounts.get(station)!;
                        phaseCounts.set(phaseLabel, (phaseCounts.get(phaseLabel) || 0) + 1);
                    }
                }
            });
        }

        const summaryData: ScanSummaryRow[] = [];
        const phaseLabels = TIME_PHASES.map(p => p.label);

        for (const station of Array.from(allStations).sort()) {
            const phaseCounts = stationPhaseCounts.get(station) || new Map<string, number>();
            let totalScans = 0;
            const row: ScanSummaryRow = { policeStation: station, totalScans: 0 };

            phaseLabels.forEach(label => {
                const count = phaseCounts.get(label) || 0;
                row[label] = count;
                totalScans += count;
            });

            row.totalScans = totalScans;
            summaryData.push(row);
        }

        setReportData(summaryData);
        setIsReportModalOpen(true);
    };

    const handleDownloadCsv = () => {
        const filename = `Report_${new Date().toISOString().slice(0, 10)}.csv`;
        convertToCSV(reportData, filename);
    };



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
                                    <option key={station} value={station}>
                                        {station}
                                    </option>
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
                                    <option key={phase.label} value={phase.label}>
                                        {phase.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-center justify-center flex-col">
                    <InputComponent
                        customPlaceholder="Search"
                        value={searchQuery}
                        setInput={setSearchQuery}
                        placeholder="Search by name or PNO..."
                    />
                    <button
                        onClick={generateReportData}
                        className="p-2 bg-green-600 flex items-center px-4 gap-2 text-white rounded-md hover:bg-green-700 transition-colors self-end shadow-md"
                    >
                        <FileSpreadsheet size={18} />
                        <span className="text-sm font-medium">Generate Report</span>
                    </button>
                </div>
            </div>

            {paginationControls}

            <UserTable
                personData={currentItems}
                qrDataMap={filteredQrDataMap}
                isLoading={isLoading}
                onEditUser={handleEdit}
            />

            {paginationControls}

            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FileSpreadsheet className="text-green-600" />
                                Generated Report Preview
                            </h2>
                            <button
                                onClick={() => setIsReportModalOpen(false)}
                                className="text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 overflow-auto z-40 flex-1">
                            {reportData.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    No data found for the selected filters.
                                </div>
                            ) : (
                                <table className="min-w-full border-collapse border border-gray-300 text-sm">
                                    <thead className="bg-gray-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">Police Station</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center font-bold text-blue-700">Total Scans</th>
                                            {TIME_PHASES.map(p => (
                                                <th key={p.label} className="border border-gray-300 px-2 py-2 text-center font-medium text-gray-600 text-xs">
                                                    {p.label.replace("Phase ", "")}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors even:bg-gray-50">
                                                <td className="border border-gray-300 px-4 py-2 font-medium text-gray-800">{row.policeStation}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center font-bold text-blue-600">{row.totalScans}</td>
                                                {TIME_PHASES.map(p => (
                                                    <td key={p.label} className={`border border-gray-300 px-2 py-2 text-center ${Number(row[p.label]) > 0 ? 'text-green-700 font-bold bg-green-50' : 'text-gray-400'}`}>
                                                        {row[p.label]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-4 rounded-b-lg">
                            <button
                                onClick={() => setIsReportModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleDownloadCsv}
                                disabled={reportData.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                <Download size={16} />
                                Download CSV
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Page;