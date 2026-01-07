"use client";
import UserTable from "@/components/Table";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";
import { usePersonStore } from "@/store/personStore";
import { Clipboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const Page = () => {
    const { getPerson, personData } = usePersonStore();
    const { userData, initializeStore, isInitialized } = useAuthStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStation, setSelectedStation] = useState(""); // New state for dropdown
    const [isLoading, setIsLoading] = useState(true);

    const debouncedSearch = useDebounce(searchQuery, 500);
    const router = useRouter();

    useEffect(() => {
        initializeStore();
    }, [initializeStore]);

    useEffect(() => {
        if (isInitialized) {
            if (userData?.id) {
                getPerson(userData.id).finally(() => setIsLoading(false));
            } else {
                setIsLoading(false);
            }
        }
    }, [isInitialized, userData?.id, getPerson]);

    // 1. Get unique list of police stations for the dropdown
    const policeStations = useMemo(() => {
        if (!personData) return [];
        const stations = personData
            .map(p => p.policeStation)
            .filter(Boolean); // Remove null/undefined
        return Array.from(new Set(stations)).sort(); // Unique and sorted
    }, [personData]);

    // 2. Updated filtering logic
    const filteredUsers = useMemo(() => {
        let filtered = personData || [];

        // Filter by Search Query
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) || p.pnoNo.includes(q)
            );
        }

        // Filter by Police Station
        if (selectedStation) {
            filtered = filtered.filter(p => p.policeStation === selectedStation);
        }

        return filtered;
    }, [personData, debouncedSearch, selectedStation]);

    return (
        <div className='w-full p-4 space-y-6'>
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm gap-4">
                <div className="flex items-center gap-4 flex-1">
                    {/* Search Bar */}
                    <input
                        type="text"
                        placeholder="Search by Name or PNO..."
                        className="border rounded-lg px-4 py-2 w-72 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Police Station Dropdown */}
                    <select
                        className="border rounded-lg px-4 py-2 w-64 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={selectedStation}
                        onChange={(e) => setSelectedStation(e.target.value)}
                    >
                        <option value="">All Police Stations</option>
                        {policeStations.map((station) => (
                            <option key={station} value={station}>
                                {station}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => router.push("/report")}
                    className="bg-slate-800 text-white px-6 py-2 cursor-pointer rounded-lg hover:bg-slate-700 transition-all flex items-center gap-2 shrink-0">
                    <Clipboard className="size-5" />
                    Generate Report
                </button>
            </div>

            <UserTable
                personData={filteredUsers}
                isLoading={isLoading}
                onEditUser={() => { }}
            />
        </div>
    );
}

export default Page;