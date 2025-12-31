"use client";
import { CheckCircle, List, QrCode, Search, Table, Trash2, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useQRstore } from '@/store/qrStore';
import { generatePdfWithQRCodes } from '@/utils/genetateQR';
import toast from 'react-hot-toast';
import { CustomCheckbox } from './CustomCheckbox';
import { Button } from './ui/button';
import { Input } from './ui/input'; // Assuming you have a Shadcn Input component or similar

// --- Helper Functions (Unchanged) ---

/**
 * Helper function to convert a camelCase or snake_case string into Title Case.
 * e.g., 'policeStation' -> 'Police Station'
 */
const toTitleCase = (str) => {
    if (!str) return '';
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Helper function to format cell values based on their type.
 */
const formatValue = (value) => {
    if (typeof value === 'boolean') {
        return value ? (
            <span className="inline-flex items-center text-green-600 font-semibold">
                <CheckCircle className="w-4 h-4 mr-1" /> Yes
            </span>
        ) : (
            <span className="inline-flex items-center text-red-600 font-semibold">
                <XCircle className="w-4 h-4 mr-1" /> No
            </span>
        );
    }

    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        try {
            return new Date(value).toLocaleString();
        } catch (e) {
            return value;
        }
    }

    return value === null ? 'N/A' : String(value);
};

// --- QRTable Component with Selection (MODIFIED) ---

/**
 * DataTable Component
 * Renders data in a responsive table, excluding specified keys.
 * **Modification: Renders data in reverse order (newest first) and includes search.**
 * @param {Array<Object>} data - The array of objects to display.
 * @param {Array<string>} excludedKeys - Keys to omit from the table columns.
 */
interface QRTableProps {
    data: any[],
    excludedKeys: string[]
}

const QRTable = ({ data, excludedKeys = [] }: QRTableProps) => {

    // 1. CALL ALL HOOKS UNCONDITIONALLY AT THE TOP LEVEL

    const getRowKey = useCallback((item, index) => item.id ?? index, []);
    const [selectedRows, setSelectedRows] = useState(new Set());
    // NEW: State for the search term
    const [searchTerm, setSearchTerm] = useState('');

    const { deleteQR, deleteMultipleQRs } = useQRstore()

    // --- Search Filtering Logic ---
    const filteredData = useMemo(() => {
        if (!searchTerm) {
            return data || [];
        }

        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        return (data || []).filter(item => {
            // Check policeStation or PoliceStation field for a case-insensitive match
            const policeStation = item.policeStation || item.PoliceStation;
            return policeStation && String(policeStation).toLowerCase().includes(lowerCaseSearchTerm);
        });
    }, [data, searchTerm]);


    const dataKeys = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];
        // Use keys from filtered data for column headers
        return Object.keys(filteredData[0]);
    }, [filteredData]);

    const filteredKeys = useMemo(() => {
        return dataKeys.filter(key => !excludedKeys.includes(key));
    }, [dataKeys, excludedKeys]);

    const allRowKeys = useMemo(() => (filteredData || []).map((item, index) => getRowKey(item, index)), [filteredData, getRowKey]);

    // Create a map for quick lookup of data objects based on their key/ID - uses the filtered data
    const dataMap = useMemo(() => {
        const map = new Map();
        (filteredData || []).forEach((item, index) => {
            map.set(getRowKey(item, index), item);
        });
        return map;
    }, [filteredData, getRowKey]);


    // **MODIFICATION:** Create a memoized array of data that is reversed for rendering.
    // **NOW USES filteredData**
    const reversedData = useMemo(() => {
        // Use a spread operator to create a shallow copy before reversing to avoid mutating the original prop
        return [...(filteredData || [])].reverse();
    }, [filteredData]);


    // 2. CONDITIONAL CHECK / EARLY RETURN (AFTER all Hooks)
    if (!data || data.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500 bg-white rounded-lg shadow-inner">
                <List className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                No data records available.
            </div>
        );
    }

    // --- Selection Logic (Unchanged, but relies on filteredData length) ---

    const isAllSelected = selectedRows.size === filteredData.length && filteredData.length > 0;
    const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedRows(new Set());
        } else {
            // Select only the currently visible/filtered rows
            setSelectedRows(new Set(allRowKeys));
        }
    };

    const handleRowSelect = (rowKey) => {
        setSelectedRows(prevSelectedRows => {
            const newSelected = new Set(prevSelectedRows);
            if (newSelected.has(rowKey)) {
                newSelected.delete(rowKey);
            } else {
                newSelected.add(rowKey);
            }
            return newSelected;
        });
    };

    // Handler for search input change
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        // Important: Clear selection when data changes due to search
        setSelectedRows(new Set());
    };

    // --- Generate QR Code Handler (Unchanged) ---
    const handleGenerateQR = async () => {
        if (selectedRows.size === 0) {
            toast.error("Please select at least one row to generate a QR code.");
            return;
        }

        const selectedDataForQR = Array.from(selectedRows).map(key => {
            // dataMap holds only the currently visible/filtered data
            const item = dataMap.get(key);
            if (!item) return null;

            return {
                lattitude: item.lattitude || '',
                longitude: item.longitude || item.Longitude || '',
                dutyPoint: item.dutyPoint || item.DutyPoint || '',
                policeStation: item.policeStation || item.PoliceStation || '',
            };
        }).filter(item => item !== null);

        if (selectedDataForQR.length > 0) {
            try {
                toast.promise(
                    generatePdfWithQRCodes(selectedDataForQR, 'selected-qr-codes.pdf'),
                    {
                        loading: 'Generating PDF with QR codes...',
                        success: <b>PDF successfully generated!</b>,
                        error: <b>Could not generate PDF.</b>,
                    }
                );
            } catch (error) {
                console.error("PDF Generation Failed:", error);
            }
        }
    };


    const handleDelete = async (selectedIds) => {
        if (selectedIds.length === 0) return;

        try {
            const message = await deleteMultipleQRs(selectedIds)
            toast.success(message || "Selected QR codes deleted successfully!")
            setSelectedRows(new Set()); // Clear selection after deletion
        } catch (error) {
            console.error("Error while deleting QRs:", error);
            toast.error("Error while deleting selected QRs")
        }
    }
    // --- Component JSX ---
    const isActionDisabled = selectedRows.size === 0;


    return (
        <div className="bg-neutral-200 rounded-xl shadow-2xl p-4 md:p-6 overflow-x-auto">
            <div className='flex flex-col sm:flex-row p-4m justify-between items-start sm:items-center gap-4 mb-4'>

                <h2 className="text-2xl font-bold text-indigo-700 flex items-center whitespace-nowrap">
                    <Table className="w-6 h-6 mr-2" />
                    Duty Point Scans
                </h2>

                {/* NEW: Search Input Section */}
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search Police Station..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 w-full"
                    />
                </div>

                <div className='flex gap-4'>
                    <Button
                        onClick={handleGenerateQR}
                        className={`cursor-pointer bg-green-700 ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'}`}
                        disabled={isActionDisabled}
                    >
                        <QrCode className="w-5 h-5 mr-2" />
                        Generate QrCode ({selectedRows.size})
                    </Button>
                    <Button
                        className={`cursor-pointer bg-red-500 ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600/70'}`}
                        disabled={isActionDisabled}
                        onClick={() => {
                            handleDelete(Array.from(selectedRows))
                        }}
                    >
                        <Trash2 className="w-5 h-5 mr-2" />
                        Delete ({selectedRows.size})
                    </Button>
                </div>

            </div>
            {/* Display Selected Count for context - now uses filteredData.length */}
            <p className="mb-3 text-sm text-gray-600">
                {selectedRows.size} of {filteredData.length} row(s) selected (Total: {data.length}).
            </p>

            {/* Conditional Display for No Results */}
            {filteredData.length === 0 && searchTerm !== '' ? (
                <div className="p-6 text-center text-gray-500 bg-white rounded-lg shadow-inner mt-4">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    No records found for "{searchTerm}".
                </div>
            ) : (
                /* Table structure */
                <table className="min-w-full divide-y divide-gray-200">

                    {/* Table Header */}
                    <thead className="bg-indigo-50 sticky top-0">
                        <tr>
                            {/* Select All Column Header */}
                            <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-800 uppercase tracking-wider whitespace-nowrap w-1">
                                <CustomCheckbox
                                    checked={isAllSelected}
                                    indeterminate={isIndeterminate}
                                    onClick={handleSelectAll}
                                />
                            </th>
                            {/* Data Columns */}
                            {filteredKeys.map((key) => (
                                <th
                                    key={key}
                                    className="px-4 py-3 text-left text-xs font-semibold text-indigo-800 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {toTitleCase(key)}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Table Body - **USES reversedData** */}
                    <tbody className="bg-white divide-y divide-gray-100">
                        {reversedData.map((item, index) => {
                            // Safer approach for the key by prioritizing item.id
                            const rowKey = item.id ? item.id : `reversed-row-${index}`;

                            const isSelected = selectedRows.has(rowKey);
                            return (
                                <tr
                                    key={rowKey} // Use the stable rowKey
                                    className={`transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-gray-50'}`}
                                    onClick={() => handleRowSelect(rowKey)}
                                >
                                    {/* Row Selection Checkbox */}
                                    <td className="px-4 py-4 text-sm font-medium text-gray-800 whitespace-nowrap w-1">
                                        <CustomCheckbox
                                            checked={isSelected}
                                            indeterminate={false}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRowSelect(rowKey);
                                            }}
                                        />
                                    </td>
                                    {/* Data Cells */}
                                    {filteredKeys.map((key) => (
                                        <td
                                            key={key}
                                            className="px-4 py-4 text-sm font-medium text-gray-800 whitespace-nowrap"
                                        >
                                            {formatValue(item[key])}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default QRTable;