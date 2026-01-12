"use client";
import {
    Edit2,
    QrCode, Save, Search, Table,
    Trash2, X
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useQRstore } from '@/store/qrStore';
import { catagoryArr } from '@/utils/constatns';
import { toTitleCase } from '@/utils/funtions';
import { generatePdfWithQRCodes } from '@/utils/genetateQR';
import toast from 'react-hot-toast';
import { CustomCheckbox } from './CustomCheckbox';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface QRTableProps {
    data: any[],
    excludedKeys: string[]
}

const QRTable = ({ data, excludedKeys = [] }: QRTableProps) => {
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [isDeleting, setIsDeleting] = useState(false);

    const { deleteMultipleQRs, updateQR } = useQRstore();

    // 1. Filter Data based on Search
    const filteredData = useMemo(() => {
        const baseData = data || [];
        if (!searchTerm) return baseData;
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        return baseData.filter(item => {
            const policeStation = String(item.policeStation || item.PoliceStation || "").toLowerCase();
            const latitude = String(item.lattitude || item.latitude || "").toLowerCase();
            const longitude = String(item.longitude || "").toLowerCase();
            const dutyPoint = String(item.dutyPoint || "").toLowerCase();

            return (
                policeStation.includes(lowerCaseSearchTerm) ||
                latitude.includes(lowerCaseSearchTerm) ||
                longitude.includes(lowerCaseSearchTerm) ||
                dutyPoint.includes(lowerCaseSearchTerm)
            );
        });
    }, [data, searchTerm]);

    // 2. Reverse data to show latest first
    const reversedData = useMemo(() => [...filteredData].reverse(), [filteredData]);

    const filteredKeys = useMemo(() => {
        if (!reversedData.length) return [];
        return Object.keys(reversedData[0]).filter(key => !excludedKeys.includes(key));
    }, [reversedData, excludedKeys]);

    // Selection Logic
    const isAllSelected = reversedData.length > 0 && selectedRows.size === reversedData.length;
    const isIndeterminate = selectedRows.size > 0 && selectedRows.size < reversedData.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedRows(new Set());
        } else {
            const newSelection = new Set(reversedData.map(item => item.id));
            setSelectedRows(newSelection);
        }
    };

    const handleRowSelect = (id: string) => {
        if (editingRowId === id) return;
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleGenerate = async () => {
        if (selectedRows.size === 0) return;
        const selectedData = data.filter(item => selectedRows.has(item.id));
        const loadingToast = toast.loading(`Generating ${selectedData.length} QR codes...`);

        try {
            const formattedData = selectedData.map(item => ({
                lattitude: item.lattitude || item.latitude,
                longitude: item.longitude,
                dutyPoint: item.dutyPoint,
                policeStation: item.policeStation
            }));

            await generatePdfWithQRCodes(formattedData, `Selected_QR_Codes_${Date.now()}.pdf`);
            toast.success("PDF generated successfully!", { id: loadingToast });
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF", { id: loadingToast });
        }
    };

    const handleDelete = async () => {
        if (selectedRows.size === 0) return;
        const confirmDelete = window.confirm(`Delete ${selectedRows.size} items?`);
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            const message = await deleteMultipleQRs(Array.from(selectedRows));
            toast.success(message as string);
            setSelectedRows(new Set());
        } catch (error) {
            toast.error("Failed to delete items");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditClick = (e: any, item: any) => {
        e.stopPropagation();
        setEditingRowId(item.id);
        setEditFormData({ ...item });
    };

    const handleSaveEdit = async (e: any) => {
        if (e) e.preventDefault();
        const payload = {
            id: editingRowId,
            lattitude: editFormData.lattitude || editFormData.latitude,
            longitude: editFormData.longitude,
            catagory: editFormData.catagory || editFormData.category,
            dutyPoint: editFormData.dutyPoint,
        };

        try {
            await updateQR(editingRowId as string, payload);
            toast.success("Saved successfully");
            setEditingRowId(null);
        } catch (err) {
            toast.error("Failed to save");
        }
    };

    console.log();

    return (
        <div className="bg-neutral-200 rounded-xl shadow-2xl p-4 md:p-6">
            <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4'>
                <h2 className="text-2xl font-bold text-indigo-700 flex items-center whitespace-nowrap">
                    <Table className="w-6 h-6 mr-2" />
                    Duty Point Scans ({reversedData.length})
                </h2>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-grow sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search points or stations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white"
                        />
                    </div>

                    <div className='flex gap-2 shrink-0'>
                        <Button
                            onClick={handleGenerate}
                            className="bg-green-700 hover:bg-green-600"
                            disabled={selectedRows.size === 0}
                        >
                            <QrCode className="w-5 h-5 mr-2" />
                            Generate ({selectedRows.size})
                        </Button>

                        <Button
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-50"
                            disabled={selectedRows.size === 0 || isDeleting}
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-5 h-5 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[70vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-50 sticky top-0 z-10">
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
                        {reversedData.map((item) => {
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
                                            onClick={(e) => {
                                                e?.stopPropagation();
                                                handleRowSelect(item.id);
                                            }}
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
                                        const editableFields = ['lattitude', 'latitude', 'longitude', 'dutyPoint', 'category', 'catagory'];
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
                                                            {catagoryArr.map((cat: any) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
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
                                                    item[key]
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
            {reversedData.length === 0 && (
                <div className='text-center py-10 text-gray-500'>No records found.</div>
            )}
        </div>
    );
};

export default QRTable;