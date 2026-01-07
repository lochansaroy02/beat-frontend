"use client";
import {
    CheckCircle,
    ChevronLeft, ChevronRight,
    Edit2, List, QrCode, Save, Search, Table,
    Trash2, X, XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useQRstore } from '@/store/qrStore';
import { catagoryArr } from '@/utils/constatns';
import toast from 'react-hot-toast';
import { CustomCheckbox } from './CustomCheckbox';
import { Button } from './ui/button';
import { Input } from './ui/input';

// --- Helper Functions ---
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

interface QRTableProps {
    data: any[],
    excludedKeys: string[]
}

const QRTable = ({ data, excludedKeys = [] }: QRTableProps) => {
    // Basic State
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const { deleteMultipleQRs } = useQRstore();
    const { updateQR } = useQRstore()
    // Reset to page 1 when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    // 1. Filter Data
    const filteredData = useMemo(() => {
        const baseData = data || [];
        if (!searchTerm) return baseData;
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return baseData.filter(item => {
            const policeStation = item.policeStation || item.PoliceStation;
            return policeStation && String(policeStation).toLowerCase().includes(lowerCaseSearchTerm);
        });
    }, [data, searchTerm]);

    // 2. Reverse Data
    const reversedData = useMemo(() => {
        return [...(filteredData || [])].reverse();
    }, [filteredData]);

    // 3. Paginate Data (This is the performance fix)
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return reversedData.slice(startIndex, startIndex + itemsPerPage);
    }, [reversedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(reversedData.length / itemsPerPage);

    const filteredKeys = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];
        return Object.keys(filteredData[0]).filter(key => !excludedKeys.includes(key));
    }, [filteredData, excludedKeys]);

    // Selection Logic
    const isAllSelected = filteredData.length > 0 && selectedRows.size === filteredData.length;
    const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedRows(new Set());
        } else {
            const newSelection = new Set(filteredData.map(item => item.id));
            setSelectedRows(newSelection);
        }
    };

    const handleRowSelect = (id) => {
        if (editingRowId === id) return;
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setEditingRowId(item.id);
        setEditFormData({ ...item });
        console.log(editFormData);
    };

    const handleSaveEdit = async (e) => {
        // Prevent form reload if inside a form
        if (e) e.preventDefault();

        const payload = {
            id: editingRowId,
            // Match the backend's expected key name exactly
            lattitude: editFormData.latitude,
            longitude: editFormData.longitude,
            catagory: editFormData.catagory,
        };

        try {
            await updateQR(editingRowId, payload);
            console.log("Updated Data:", editFormData);
            setEditingRowId(null);
        } catch (err) {
            toast.error("Failed to save changes");
        }
    };
    if (!data || data.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500 bg-white rounded-lg shadow-inner">
                <List className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                No data records available.
            </div>
        );
    }

    return (
        <div className="bg-neutral-200 rounded-xl shadow-2xl p-4 md:p-6 overflow-x-auto">
            {/* Header Section */}
            <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4'>
                <h2 className="text-2xl font-bold text-indigo-700 flex items-center whitespace-nowrap">
                    <Table className="w-6 h-6 mr-2" />
                    Duty Point Scans
                </h2>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-grow sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search Police Station..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white"
                        />
                    </div>

                    <div className='flex gap-2 shrink-0'>
                        <Button className="bg-green-700 hover:bg-green-600" disabled={selectedRows.size === 0}>
                            <QrCode className="w-5 h-5 mr-2" />
                            Generate ({selectedRows.size})
                        </Button>
                        <Button className="bg-red-500 hover:bg-red-600" disabled={selectedRows.size === 0}>
                            <Trash2 className="w-5 h-5 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="overflow-hidden border border-gray-200 rounded-t-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-50">
                        <tr>
                            <th className="px-4 py-3 w-1">
                                <CustomCheckbox
                                    checked={isAllSelected}
                                    indeterminate={isIndeterminate}
                                    onClick={handleSelectAll}
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-800 uppercase">Actions</th>
                            {filteredKeys.map((key) => (
                                <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-indigo-800 uppercase whitespace-nowrap">
                                    {toTitleCase(key)}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedData.map((item) => {
                            const isEditing = editingRowId === item.id;
                            const isSelected = selectedRows.has(item.id);

                            return (
                                <tr
                                    key={item.id}
                                    className={`transition-colors cursor-pointer ${isEditing ? 'bg-amber-50' : isSelected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-gray-50'}`}
                                    onClick={() => handleRowSelect(item.id)}
                                >
                                    <td className="px-4 py-4 w-1">
                                        <CustomCheckbox
                                            checked={isSelected}
                                            indeterminate={false}
                                            onClick={() => handleRowSelect(item.id)}
                                        />
                                    </td>

                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded">
                                                    <Save className="w-5 h-5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingRowId(null); }} className="p-1 text-red-600 hover:bg-red-100 rounded">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={(e) => handleEditClick(e, item)} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded">
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </td>

                                    {filteredKeys.map((key) => {
                                        const editableFields = ['lattitude', 'longitude', 'dutyPoint', 'category', 'catagory'];
                                        const isEditableField = editableFields.includes(key);

                                        return (
                                            <td key={key} className="px-4 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                                                {isEditing && isEditableField ? (
                                                    (key === 'category' || key === 'catagory') ? (
                                                        <select
                                                            value={editFormData[key] || ''}
                                                            onChange={(e) => setEditFormData({ ...editFormData, [key]: e.target.value })}
                                                            className="p-1 border rounded bg-white text-sm"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {catagoryArr.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                                                        </select>
                                                    ) : (
                                                        <Input
                                                            value={editFormData[key] || ''}
                                                            onChange={(e) => setEditFormData({ ...editFormData, [key]: e.target.value })}
                                                            className="h-8 min-w-[100px] text-sm"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )
                                                ) : (
                                                    formatValue(item[key])
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- Pagination Controls --- */}
            <div className="bg-white border-x border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-b-lg sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                    <Button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                    >
                        Previous
                    </Button>
                    <Button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                    >
                        Next
                    </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex gap-4 items-center">
                        <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, reversedData.length)}</span> of{' '}
                            <span className="font-medium">{reversedData.length}</span> results
                        </p>

                        {/* Items Per Page Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Rows:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="text-sm border border-gray-300 rounded p-1 bg-white focus:ring-indigo-500"
                            >
                                {[10, 20, 50, 100].map(val => (
                                    <option key={val} value={val}>{val}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-indigo-50 text-sm font-semibold text-indigo-700">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRTable;