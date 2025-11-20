"use client";

import { useUserStore } from "@/store/userStore";
import { Person, QRDataItem } from "@/types/type";
import { cordToAddress } from "@/utils/cordToAddress";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ImageSlider from "./ImageSlider";

// Define a type for a single QR scan record for better clarity
type QrScanData = QRDataItem;

// Update the props type
type UserTableProps = {
    personData: Person[],
    qrDataMap: Map<string, QRDataItem[]>,
    isLoading: boolean,
    onEditUser: (person: Person) => void;
}


const UserTable = ({ personData, qrDataMap, isLoading, onEditUser }: UserTableProps) => {

    const route = useRouter();
    const { setSelectedUser } = useUserStore();

    // Local state for geocoded addresses for the current page's personnel
    const [addressMap, setAddressMap] = useState<Map<string, string>>(new Map());

    // Effect to handle geocoding only for the visible personnel
    useEffect(() => {
        if (personData.length === 0) {
            setAddressMap(new Map());
            return;
        }

        const fetchAddressesForVisible = async () => {
            const newAddressMap = new Map<string, string>();
            const addressPromises: Promise<void>[] = [];

            for (const person of personData) {
                const pnoNo = person.pnoNo;
                const qrData = qrDataMap.get(pnoNo);
                // Get the last scan for this person
                const lastScan = qrData && qrData.length > 0 ? qrData[qrData.length - 1] : null;

                const existingAddress = addressMap.get(pnoNo);
                if (existingAddress && existingAddress !== 'Fetching Address...') {
                    newAddressMap.set(pnoNo, existingAddress);
                    continue;
                }

                // Check for existence of lat/long before attempting geocoding
                if (lastScan && lastScan.lattitude && lastScan.longitude) {
                    newAddressMap.set(pnoNo, 'Fetching Address...');

                    const promise = cordToAddress(lastScan.lattitude, lastScan.longitude)
                        .then(address => {
                            newAddressMap.set(pnoNo, address || 'Address N/A');
                        }).catch(e => {
                            newAddressMap.set(pnoNo, 'Error Fetching Address');
                        });
                    addressPromises.push(promise);
                } else {
                    newAddressMap.set(pnoNo, 'N/A');
                }
            }

            if (addressPromises.length > 0) {
                await Promise.all(addressPromises);
            }

            setAddressMap(prevMap => new Map([...prevMap, ...newAddressMap]));
        };

        fetchAddressesForVisible();

    }, [personData, qrDataMap]);

    const handleEditUser = (data: any) => {
        setSelectedUser(data);
        route.push('/add-users');
    };

    const handleDelete = (personId: string, scanId?: string) => {
        if (window.confirm(`Are you sure you want to delete this ${scanId ? 'scan record' : 'person record'}?`)) {
            console.log(`Delete requested for Person ID: ${personId}, Scan ID: ${scanId || 'N/A'}`);
            // TODO: Implement actual delete API call logic here
        }
    };

    // Function to render the Name cell content (including the Edit button)
    const renderNameCell = (person: Person) => (
        <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{person.name}</span>
            <button
                // Calls the edit handler passed down from the parent dashboard
                onClick={() => onEditUser(person)}
                className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                title="Edit User Details"
            >
                <Pencil className="w-4 h-4" />
            </button>
        </div>
    );

    // --- Loading and Empty State ---

    if (isLoading && personData.length === 0) {
        return (
            <div className='w-full h-full p-4 flex  gap-4 items-center justify-center'>
                <span className="animate-spin">
                    <Loader2 />
                </span>
                <p className='text-center'>
                    Loading
                </p>
            </div>
        );
    }

    if (personData.length === 0) {
        return (
            <div className='w-full p-4 '>
                <p className='text-center'>No data found</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto shadow-lg rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr No.</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PNO No.</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location (Address)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scanned On</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Police Station</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duty Point</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {
                        personData.map((person: Person, index: number) => {
                            // Safely retrieve and cast QR data
                            const personQrData: QrScanData[] = (qrDataMap.get(person.pnoNo) || []) as QrScanData[];
                            const scanCount = personQrData.length;
                            const address = addressMap.get(person.pnoNo) || (scanCount > 0 ? 'Fetching Address...' : 'N/A');

                            if (scanCount === 0) {
                                // CASE 1: No scan data found
                                return (
                                    <tr key={person.id || index} className='hover:bg-gray-100 transition-colors bg-red-50/50'>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{index + 1}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{renderNameCell(person)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{person.pnoNo}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{address}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">Never Scanned</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">N/A</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">N/A</td>
                                        <td className="px-6 py-4"><ImageSlider photos={person.photos} /></td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            <button
                                                onClick={() => handleDelete(person.id!)}
                                                className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                                title="Delete Person Record (No Scans)"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }

                            // CASE 2: Scan data exists (render multiple rows with rowSpan)
                            return personQrData.map((scan: QrScanData, scanIndex: number) => {
                                return (
                                    <tr key={`${person.id}-${scan.id || scanIndex}`} className='hover:bg-gray-100 transition-colors'>

                                        {/* RowSpan Columns (Only render these on the FIRST row) */}
                                        {scanIndex === 0 && (
                                            <>
                                                <td rowSpan={scanCount} className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">{index + 1}</td>
                                                <td rowSpan={scanCount} className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                                                    {renderNameCell(person)}
                                                </td>
                                                <td rowSpan={scanCount} className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{person.pnoNo}</td>
                                                <td rowSpan={scanCount} className="px-6 py-4 whitespace-normal text-sm text-gray-700 border-r border-gray-200">{address}</td>
                                            </>
                                        )}

                                        {/* Scan-specific data */}
                                        <td className="px-6 py-4 text-sm text-gray-700">{scan.scannedOn || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{scan.policeStation || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{scan.dutyPoint || 'N/A'}</td>

                                        {/* Images (RowSpan) - Only on the first row */}
                                        {scanIndex === 0 && (
                                            <td rowSpan={scanCount} className="px-6 py-4 border-l border-gray-200">
                                                <ImageSlider photos={person.photos} />
                                            </td>
                                        )}

                                        {/* Actions Column (Scan-specific Deletion) */}
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            <button
                                                onClick={() => handleDelete(person.id!, scan.id)}
                                                className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                                title="Delete Scan Record"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        })
                    }
                </tbody>
            </table>
        </div>
    )
}

export default UserTable;