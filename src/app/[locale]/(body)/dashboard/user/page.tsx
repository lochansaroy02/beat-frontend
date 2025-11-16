"use client";

import UserTable from "@/components/Table";
import DatePicker from "@/components/ui/datePicker";
import InputComponent from "@/components/ui/InputComponent";
import { useAuthStore } from "@/store/authStore";
import { usePersonStore } from "@/store/personStore";
import { useQRstore } from "@/store/qrStore";
import { Person, QRDataItem } from "@/types/type";
// NOTE: cordToAddress is now moved/used more strategically in the table/hook
import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// --- Utility Definitions (TIME_PHASES, CSV, Aggregation Logic remain the same) ---
interface TimePhase {
    label: string;
    startHour: number; // 24-hour format (0-23)
    endHour: number;   // 24-hour format (0-23)
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
    // ... (CSV logic remains the same)
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

const aggregateScanData = (qrDataMap: Map<string, QRDataItem[]>): ScanSummaryRow[] => {
    // ... (Aggregation logic remains the same)
    const stationPhaseCounts = new Map<string, Map<string, number>>();
    const allStations = new Set<string>();

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

    for (const [, qrData] of qrDataMap.entries()) {
        qrData.forEach(item => {
            if (item.policeStation && item.scannedOn) {
                const station = item.policeStation;
                const scannedOnParts = item.scannedOn.split(' ');
                const timeStr = scannedOnParts.slice(1).join(' ');
                const phaseLabel = getTimePhaseLabel(timeStr);

                if (phaseLabel) {
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
    return summaryData;
};
// -----------------------------------------------------------

const Page = () => {
    // Kept for reference
    const { getPerson, personData } = usePersonStore(); // ADDED updatePersonDetails
    const { getQRData } = useQRstore();

    const { userData: authUserData, initializeStore, isInitialized } = useAuthStore();

    // Use filteredData for the *entire* list that matches filters
    const [filteredData, setFilteredData] = useState<Person[]>(personData);

    const [qrDataMap, setQrDataMap] = useState<Map<string, QRDataItem[]>>(new Map());
    // NOTE: addressMap is removed from Page.tsx to simplify and avoid huge state updates
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Date/Time States ---
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [actualStartDate, setActualStartDate] = useState<string>("");
    const [actualEndDate, setActualEndDate] = useState<string>("");
    const [selectedTimePhase, setSelectedTimePhase] = useState<string>("");
    const [selectedPoliceStation, setSelectedPoliceStation] = useState<string>("");
    // -------------------------------------

    // --- NEW PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20); // Set a reasonable number of items per page
    // ----------------------------

    // --- EDIT STATE MANAGEMENT (Kept for completeness, though modal component is omitted) ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<Person | null>(null);

    const handleEdit = (person: Person) => {
        setUserToEdit(person);
        setIsEditModalOpen(true);
    };

    const handleSave = async (updatedUser: Person) => {
        // ... (Handle save logic, calling store action)
        const updatedList = personData.map(p =>
            p.pnoNo === updatedUser.pnoNo ? updatedUser : p
        );
        usePersonStore.setState({ personData: updatedList });
        setIsEditModalOpen(false);
        setUserToEdit(null);
        // Force filter re-run to update the table immediately
        applyFilters();
    };
    // -------------------------------------


    /** * Fetches the initial person data for the current user. */
    const handleGetPersonData = useCallback(async (userId: number | undefined) => {
        if (userId) {
            //@ts-ignore
            await getPerson(userId);
        } else {
            setIsLoading(false);
        }
    }, [getPerson]);


    // Initialize the Auth Store on mount
    useEffect(() => {
        initializeStore();
    }, [initializeStore]);


    // 1. Initial Load: Fetch person data once the store is initialized AND we have user data
    useEffect(() => {
        if (isInitialized && authUserData?.id) {
            handleGetPersonData(authUserData.id);
        } else if (isInitialized && !authUserData?.id) {
            setIsLoading(false);
        }
    }, [isInitialized, authUserData?.id, handleGetPersonData]);


    // Synchronize filteredData when personData is fetched and updated in the store.
    useEffect(() => {
        // Reset filters when the source data changes
        setFilteredData(personData);
    }, [personData]);


    const fetchQRDataForPerson = useCallback(async (pnoNumber: string): Promise<QRDataItem[]> => {
        try {
            const response = await getQRData(pnoNumber);
            if (response?.data.success) {
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error(`Error fetching QR data for PNO ${pnoNumber}:`, error);
            return [];
        }
    }, [getQRData]);


    // 2. Secondary Load: Fetch QR data once personData is available
    useEffect(() => {
        if (personData && personData.length > 0) {
            const fetchAllQrData = async () => {
                setIsLoading(true);
                const newQrDataMap = new Map<string, QRDataItem[]>();

                const fetchPromises = personData.map(async (person: Person) => {
                    // Only fetch if data is not already in the map
                    if (!qrDataMap.has(person.pnoNo)) {
                        const data = await fetchQRDataForPerson(person.pnoNo);
                        newQrDataMap.set(person.pnoNo, data);
                    }
                });

                await Promise.all(fetchPromises);
                setQrDataMap(prevMap => new Map([...prevMap, ...newQrDataMap]));
                setIsLoading(false);
            };

            // Only run the fetch if there are new PNOs to fetch for
            const hasNewData = personData.some(p => !qrDataMap.has(p.pnoNo));

            if (hasNewData || qrDataMap.size === 0) {
                fetchAllQrData();
            } else {
                setIsLoading(false);
            }
        } else if (personData && personData.length === 0) {
            setIsLoading(false);
        }
    }, [personData, fetchQRDataForPerson, qrDataMap]); // Added qrDataMap as dependency


    /**
     * Formats the Date object into a DD-MM-YYYY string for searching.
     */
    function formatDateString(dateStr: Date | undefined, setter: React.Dispatch<React.SetStateAction<string>>) {
        if (!dateStr) {
            setter("");
            return;
        }
        const date = new Date(dateStr);
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();

        setter(`${dd}-${mm}-${yyyy}`);
    }

    // Run formatting when start/end date pickers change
    useEffect(() => {
        formatDateString(startDate, setActualStartDate);
    }, [startDate]);

    useEffect(() => {
        formatDateString(endDate, setActualEndDate);
    }, [endDate]);


    // Helper function to determine if a scan time falls within a selected phase
    const isTimeInPhase = (timeStr: string, phase: TimePhase): boolean => {
        if (!timeStr) return false;

        const parts = timeStr.trim().split(' ');
        if (parts.length < 2) return false;

        const [timePart, ampm] = parts;
        const [hourStr] = timePart.split(':');
        let scanHour = parseInt(hourStr, 10);

        if (isNaN(scanHour)) return false;

        if (ampm === 'PM' && scanHour !== 12) {
            scanHour += 12;
        } else if (ampm === 'AM' && scanHour === 12) {
            scanHour = 0;
        }

        if (phase.startHour >= phase.endHour) {
            return scanHour >= phase.startHour || scanHour < phase.endHour;
        } else {
            return scanHour >= phase.startHour && scanHour < phase.endHour;
        }
    };


    // 4. Extract unique police stations from QR Data Map
    const uniquePoliceStations = useMemo(() => {
        const stations = new Set<string>();
        for (const qrData of qrDataMap.values()) {
            qrData.forEach(item => {
                if (item.policeStation) {
                    stations.add(item.policeStation);
                }
            });
        }
        return Array.from(stations).sort();
    }, [qrDataMap]);


    const applyFilters = useCallback(() => {
        let currentFilteredData = personData;
        const selectedPhase = TIME_PHASES.find(p => p.label === selectedTimePhase);

        const pnoNosWithScanMatch = new Set<string>();
        const needsScanFiltering = actualStartDate || actualEndDate || selectedTimePhase || selectedPoliceStation;

        if (needsScanFiltering) {
            // ... (Date/Time filtering logic remains the same)
            const startOfDay = actualStartDate ? (() => {
                const [sDay, sMonth, sYear] = actualStartDate.split('-').map(Number);
                const date = new Date(sYear, sMonth - 1, sDay);
                date.setHours(0, 0, 0, 0);
                return date;
            })() : null;

            const endOfDay = actualEndDate ? (() => {
                const [eDay, eMonth, eYear] = actualEndDate.split('-').map(Number);
                const date = new Date(eYear, eMonth - 1, eDay);
                date.setHours(23, 59, 59, 999);
                return date;
            })() : null;

            for (const [pnoNo, qrData] of qrDataMap.entries()) {
                const hasScanMatch = qrData.some(item => {
                    if (!item.scannedOn) return false;

                    let stationMatches = selectedPoliceStation ? item.policeStation === selectedPoliceStation : true;
                    if (!stationMatches) return false;

                    const parts = item.scannedOn.split(' ');
                    const datePart = parts[0];
                    const timeStr = parts.slice(1).join(' ');

                    let dateMatches = true;
                    if (actualStartDate || actualEndDate) {
                        const [qDay, qMonth, qYear] = datePart.split('-').map(Number);
                        if (qDay === undefined || qMonth === undefined || qYear === undefined) return false;

                        const scanDate = new Date(qYear, qMonth - 1, qDay);
                        scanDate.setHours(12, 0, 0, 0);

                        let startMatch = startOfDay ? scanDate.getTime() >= startOfDay.getTime() : true;
                        let endMatch = endOfDay ? scanDate.getTime() <= endOfDay.getTime() : true;

                        if (startOfDay && !endOfDay) {
                            startMatch = datePart === actualStartDate;
                        }
                        if (endOfDay && !startOfDay) {
                            endMatch = datePart === actualEndDate;
                        }

                        dateMatches = startMatch && endMatch;
                    }
                    if (!dateMatches) return false;

                    let timeMatches = selectedPhase && timeStr ? isTimeInPhase(timeStr, selectedPhase) : true;

                    return dateMatches && timeMatches && stationMatches;
                });

                if (hasScanMatch) {
                    pnoNosWithScanMatch.add(pnoNo);
                }
            }

            currentFilteredData = currentFilteredData.filter((person: Person) =>
                pnoNosWithScanMatch.has(person.pnoNo)
            );
        }

        // 5. Filter by Search Query (Name or PNO No.)
        if (searchQuery) {
            currentFilteredData = currentFilteredData.filter((item: Person) =>
                item.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
                item.pnoNo.includes(searchQuery)
            );
        }

        // Set the filtered data and reset pagination to the first page
        setFilteredData(currentFilteredData);
        setCurrentPage(1); // Crucial to reset the page on filter change
    }, [personData, searchQuery, actualStartDate, actualEndDate, selectedTimePhase, selectedPoliceStation, qrDataMap]);


    // Apply filters automatically when any dependency changes
    useEffect(() => {
        applyFilters();
    }, [searchQuery, actualStartDate, actualEndDate, selectedTimePhase, selectedPoliceStation, applyFilters]);


    // --- PAGINATION LOGIC ---
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = useMemo(() => {
        // Reverse to show latest first, then slice for pagination
        return filteredData.slice().reverse().slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredData, indexOfFirstItem, indexOfLastItem]);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const paginationControls = (
        <div className="flex justify-between items-center my-4">
            <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 bg-gray-200 rounded disabled:opacity-50"
            >
                Previous
            </button>
            <span>
                Page {currentPage} of {totalPages} (Total: {totalItems} records)
            </span>
            <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages || totalItems === 0}
                className="p-2 bg-gray-200 rounded disabled:opacity-50"
            >
                Next
            </button>
        </div>
    );
    // ------------------------

    const handleSearchClick = () => {
        applyFilters();
    };


    // --- Handle Download Click ---
    const handleDownloadSummary = () => {
        const summaryData = aggregateScanData(qrDataMap);
        const filename = `Scan_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
        convertToCSV(summaryData, filename);
    };
    // ------------------------------------------



    return (
        <div className='w-full p-4'>
            <div className="glass-effect my-4 h-24 flex items-center gap-4 px-4 ">

                {/* Police Station Selector */}
                <div>
                    <label className="text-sm">Police Station</label>
                    <select
                        value={selectedPoliceStation}
                        onChange={(e) => setSelectedPoliceStation(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md h-10 w-48 text-sm"
                    >
                        <option value="">All Stations</option>
                        {uniquePoliceStations.map((station) => (
                            <option key={station} value={station}>
                                {station}
                            </option>
                        ))}
                    </select>
                </div>

                {/* DatePickers for Start and End Date */}
                <div>
                    <label className="text-sm">Start Date</label>
                    <DatePicker date={startDate} setDate={setStartDate} />
                </div>
                <div>
                    <label className="text-sm">End Date</label>
                    <DatePicker date={endDate} setDate={setEndDate} />
                </div>
                {/* Time Phase Selector */}
                <div>
                    <label className="text-sm">Time Phase</label>
                    <select
                        value={selectedTimePhase}
                        onChange={(e) => setSelectedTimePhase(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md h-10 w-48 text-sm"
                    >
                        <option value="">All Times</option>
                        {TIME_PHASES.map((phase) => (
                            <option key={phase.label} value={phase.label}>
                                {phase.label}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Search and Download */}
                <div className="flex gap-4 items-center">
                    <InputComponent
                        value={searchQuery}
                        setInput={setSearchQuery}
                        placeholder="Search by name or PNO..."
                    />
                    <button
                        onClick={handleDownloadSummary}
                        className="p-2 bg-blue-500 text-white rounded-md h-10 hover:bg-blue-600 transition-colors self-end"
                    >
                        <Download />
                    </button>
                </div>
            </div>

            {paginationControls}

            <UserTable
                // Only pass the items for the current page
                personData={currentItems}
                qrDataMap={qrDataMap}
                // addressMap is now managed internally or via a hook in UserTable
                isLoading={isLoading}
                onEditUser={handleEdit}
            />

            {paginationControls}


        </div>
    );
}

export default Page;