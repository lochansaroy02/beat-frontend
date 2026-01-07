"use client";
import { useQRstore } from "@/store/qrStore"; // Import your store
import { cordToAddress } from "@/utils/cordToAddress";
import { convertToLocalFormat } from "@/utils/funtions";
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
    isLoading: boolean,
    onEditUser: (person: any) => void;
}

const LocationCell = memo(({ lat, long, initialLocation }: { lat?: string, long?: string, initialLocation?: string }) => {
    const [address, setAddress] = useState<string>(initialLocation || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialLocation && initialLocation.length > 5) return;
        if (lat && long) {
            setLoading(true);
            const timeout = setTimeout(() => {
                cordToAddress(lat, long)
                    .then((fetchedAddress) => { if (fetchedAddress) setAddress(fetchedAddress); })
                    .catch(() => setAddress("Loc failed"))
                    .finally(() => setLoading(false));
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [lat, long, initialLocation]);

    if (loading) return <span className="text-xs text-blue-400 animate-pulse">Resolving...</span>;
    return (
        <div className="flex items-start gap-2 min-w-[200px]">
            <MapPin size={16} className="text-red-500 mt-1 shrink-0" />
            <span className="text-sm text-gray-700 break-words line-clamp-2">{address || "Location N/A"}</span>
        </div>
    );
});

// --- OPTIMIZED: Lazy Fetching Accordion ---
const PersonAccordion = memo(({ person, onEdit }: { person: any, onEdit: (p: any) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [scans, setScans] = useState<any[]>([]);
    const [fetchingScans, setFetchingScans] = useState(false);
    const { getQRData, allQRData } = useQRstore();




    useEffect(() => {
        if (isOpen && scans.length === 0) {
            const loadData = async () => {
                setFetchingScans(true);
                try {
                    const result = await getQRData(person.id);
                    console.log(result);
                    if (result && result.success) {
                        setScans(result.data); // result.data is the array from backend
                    }
                } catch (error) {
                    console.error("Error fetching scans:", error);
                } finally {
                    setFetchingScans(false);
                }
            };
            loadData();
        }
    }, [isOpen, person.pnoNo, getQRData, scans.length]);

    return (
        <div className="border border-gray-200 rounded-lg mb-4 bg-white shadow-sm overflow-hidden">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gray-50 p-4 cursor-pointer flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 select-none"
            >
                <div className="flex items-start gap-3 w-full lg:w-auto">
                    <div className={`mt-1 p-2 rounded-full ${isOpen ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-gray-800 text-lg">{person.name}</h3>
                            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">{person.pnoNo}</span>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(person); }} className="p-1 hover:bg-blue-100 rounded text-blugree-600 ml-2">
                                <Pencil size={14} />
                            </button>
                        </div>
                        <div className="text-sm text-gray-500 flex flex-wrap gap-x-6">
                            <span className="flex items-center gap-1"><Shield size={14} /> CO: {person.co || "N/A"}</span>
                            <span className="flex items-center gap-1"><MapPin size={14} /> Station: {person.policeStation || "N/A"}</span>
                        </div>
                    </div>
                </div>
                <div className="text-center px-4 py-2 bg-white border border-gray-200 rounded-lg min-w-[100px]">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Total Scans</div>
                    <div className="text-xl font-bold text-blue-600">{person.totalCount ?? 0}</div>
                </div>
            </div>

            {isOpen && (
                <div className="border-t border-gray-200 bg-white min-h-[100px]">
                    {fetchingScans ? (
                        <div className="flex flex-col items-center justify-center p-10 gap-2">
                            <Loader2 className="animate-spin text-blue-600" size={28} />
                            <p className="text-sm text-gray-500">Loading scan history...</p>
                        </div>
                    ) : scans.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic">No scan history available.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Location</th>
                                        <th className="px-4 py-3">Time</th>
                                        <th className="px-4 py-3">Station</th>
                                        <th className="px-4 py-3">Duty Point</th>
                                        <th className="px-4 py-3 text-center">Images</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {scans.map((scan, idx) => (
                                        <tr key={scan.id || idx} className="hover:bg-blue-50/30">
                                            <td className="px-4 py-3">
                                                <LocationCell lat={scan.lattitude} long={scan.longitude} initialLocation={scan.location || scan.address} />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">{
                                                convertToLocalFormat(scan.scannedOn)

                                            }</td>
                                            <td className="px-4 py-3">{scan.policeStation || "-"}</td>
                                            <td className="px-4 py-3">{scan.dutyPoint || "N/A"}</td>
                                            <td className="px-4 py-3 text-center">
                                                <ImageSlider photos={scan?.photo || []} />
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



const UserTable = ({ personData, isLoading, onEditUser }: UserTableProps) => {


    if (isLoading && personData.length === 0) {
        return (
            <div className='w-full h-64 flex flex-col gap-4 items-center justify-center text-gray-500'>
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p>Loading data...</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-2 pb-10">
            {personData.map((person) => (
                <PersonAccordion key={person.id} person={person} onEdit={onEditUser} />
            ))}
        </div>
    );
};

export default memo(UserTable);