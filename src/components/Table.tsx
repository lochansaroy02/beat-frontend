"use client";
import { cordToAddress } from "@/utils/cordToAddress";
import {
    ChevronDown,
    ChevronUp,
    Loader2,
    MapPin,
    Pencil,
    Shield
} from "lucide-react";
import { memo, useEffect, useState } from "react";
import ImageSlider from "./ImageSlider";

// --- Types ---
type UserTableProps = {
    personData: any[],
    qrDataMap: Map<string, any[]>,
    isLoading: boolean,
    onEditUser: (person: any) => void;
}

// --- OPTIMIZATION 1: Isolated Location Component ---
const LocationCell = memo(({ lat, long, initialLocation }: { lat?: string, long?: string, initialLocation?: string }) => {
    const [address, setAddress] = useState<string>(initialLocation || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialLocation && initialLocation.length > 5) return;

        if (lat && long) {
            setLoading(true);
            const delay = Math.random() * 1000;

            const timeout = setTimeout(() => {
                cordToAddress(lat, long)
                    .then((fetchedAddress) => {
                        if (fetchedAddress) setAddress(fetchedAddress);
                    })
                    .catch(() => setAddress("Loc failed"))
                    .finally(() => setLoading(false));
            }, delay);

            return () => clearTimeout(timeout);
        }
    }, [lat, long, initialLocation]);

    if (loading) return <span className="text-xs text-blue-400 animate-pulse">Resolving...</span>;

    return (
        <div className="flex items-start gap-2 min-w-[200px]">
            <MapPin size={16} className="text-red-500 mt-1 shrink-0" />
            <span className="text-sm text-gray-700 break-words line-clamp-2" title={address}>
                {address || "Location N/A"}
            </span>
        </div>
    );
});
LocationCell.displayName = "LocationCell";

// --- OPTIMIZATION 2: Memoized Accordion Row ---
const PersonAccordion = memo(({
    person,
    scans,
    onEdit
}: {
    person: any,
    scans: any[],
    onEdit: (p: any) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg mb-4 bg-white shadow-sm overflow-hidden content-visibility-auto">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gray-50 p-4 cursor-pointer flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 select-none"
            >
                <div className="flex items-start gap-3 w-full lg:w-auto">
                    <div className={`mt-1 p-2 rounded-full ${isOpen ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'} transition-colors`}>
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-bold text-gray-800 text-lg">{person.name}</h3>
                            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                                {person.pnoNo}
                            </span>
                            <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => onEdit(person)} className="p-1 hover:bg-blue-100 rounded text-blue-600">
                                    <Pencil size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
                            <span className="flex items-center gap-1">
                                <Shield size={14} className="text-gray-400" />
                                CO: <span className="font-semibold text-gray-700">{(person as any).co || "N/A"}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <MapPin size={14} className="text-gray-400" />
                                Station: <span className="font-semibold text-gray-700">{(person as any).policeStation || "N/A"}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- UPDATED SECTION: Using person.totalCount --- */}
                <div className="flex gap-4 self-end lg:self-auto w-full lg:w-auto justify-end">
                    <div className="text-center px-4 py-2 bg-white border border-gray-200 rounded-lg min-w-[100px]">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Scans</div>
                        <div className="text-xl font-bold text-blue-600">
                            {(person as any).totalCount ?? 0}
                        </div>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="border-t border-gray-200 bg-white">
                    {scans.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic">No scan history available.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[250px]">Location</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Time</th>
                                        <th className="px-4 py-3">Station</th>
                                        <th className="px-4 py-3">Duty Point</th>
                                        <th className="px-4 py-3 text-center">Images</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {scans.map((scan, idx) => (
                                        <tr key={scan.id || idx} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <LocationCell
                                                    lat={scan.lattitude}
                                                    long={scan.longitude}
                                                    initialLocation={(scan as any).location || (scan as any).address}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{scan.scannedOn}</td>
                                            <td className="px-4 py-3 text-gray-600">{scan.policeStation || "-"}</td>
                                            <td className="px-4 py-3">{scan.dutyPoint || "N/A"}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center">
                                                    <ImageSlider photos={person.photos} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
PersonAccordion.displayName = "PersonAccordion";

// --- MAIN COMPONENT ---
const UserTable = ({ personData, qrDataMap, isLoading, onEditUser }: UserTableProps) => {
    if (isLoading && personData.length === 0) {
        return (
            <div className='w-full h-64 flex flex-col gap-4 items-center justify-center text-gray-500'>
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p>Loading data...</p>
            </div>
        );
    }

    if (personData.length === 0) {
        return <div className='w-full p-8 text-center text-gray-400'>No records found.</div>;
    }

    return (
        <div className="flex flex-col gap-2 pb-10">
            {personData.map((person) => (
                <PersonAccordion
                    key={person.id}
                    person={person}
                    scans={qrDataMap.get(person.pnoNo) || []}
                    onEdit={onEditUser}
                />
            ))}
        </div>
    );
};

export default memo(UserTable);