"use client";
import UserTable from "@/components/Table";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";
import { usePersonStore } from "@/store/personStore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const Page = () => {
    const { getPerson, personData } = usePersonStore();
    const { userData, initializeStore, isInitialized } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const debouncedSearch = useDebounce(searchQuery, 500);
    const router = useRouter();




    useEffect(() => {
        getPerson(userData?.id)
    }, []);
    useEffect(() => { initializeStore(); }, [initializeStore]);

    useEffect(() => {
        if (isInitialized) {
            if (userData?.id) {
                getPerson(userData.id).finally(() => setIsLoading(false));
            } else {
                setIsLoading(false);
            }
        }
    }, [isInitialized, userData?.id, getPerson]);

    const filteredUsers = useMemo(() => {
        if (!debouncedSearch) return personData || [];
        const q = debouncedSearch.toLowerCase();
        return (personData || []).filter(p =>
            p.name.toLowerCase().includes(q) || p.pnoNo.includes(q)
        );
    }, [personData, debouncedSearch]);

    return (
        <div className='w-full p-4 space-y-6'>
            {/* Minimal Filter for the main table */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <input
                    type="text"
                    placeholder="Search by Name or PNO..."
                    className="border rounded-lg px-4 py-2 w-72 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                    onClick={() => router.push("/report")}
                    className="bg-slate-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-slate-700 transition-all flex items-center gap-2"
                >
                    📊 View Detailed Report
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