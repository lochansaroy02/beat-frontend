"use client";
import { Button } from "@/components/ui/button";
import { useQRstore } from "@/store/qrStore";
import React, { useState } from 'react';
import toast from "react-hot-toast";
import * as XLSX from 'xlsx';

// Re-using the QR data interface from the store for clarity
interface QrProps {
    lattitude: string;
    longitude: string;
    policeStation: string;
    dutyPoint?: string; // Optional dutyPoint for flexibility
}

interface ExcelUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({ isOpen, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { createBulkQR, } = useQRstore();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage('');
        }
    };

    const handleUpload = () => {
        if (!file) {
            setMessage('Please select an Excel file.');
            return;
        }

        setLoading(true);
        setMessage('Processing file...');

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert sheet to JSON array
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                // Map/validate data to match QrProps
                const bulkData: QrProps[] = json.map(row => ({
                    lattitude: String(row.Latitude || row.latitude || row['Latitude']), // Use common column names
                    longitude: String(row.Longitude || row.longitude || row['Longitude']),
                    policeStation: String(row['Police Station'] || row.policeStation),
                    dutyPoint: String(row['Duty Point'] || row.dutyPoint || ""),
                    CUG: String(row['CUG'] || row.cug)
                })).filter(item => item.lattitude && item.longitude && item.policeStation && item.CUG); // Filter out invalid rows

                if (bulkData.length === 0) {
                    throw new Error("No valid data found. Ensure your columns are 'Lattitude', 'Longitude', 'Police Station', 'Duty Point'.");
                }


                console.log(bulkData);
                // Send bulk data to the store/backend
                setMessage(`Found ${bulkData.length} valid entries. Uploading...`);
                const result = await createBulkQR(bulkData);
                console.log(result);
                if (result) {
                    setMessage(`Successfully processed ${bulkData.length} entries. See console for details.`);
                    toast.success("Data uploaded successfully")
                    // Optionally close the modal on success
                    setTimeout(onClose, 2000);
                } else {
                    setMessage('Upload failed. Check server response.');
                }


            } catch (error: any) {
                console.error("Excel processing error:", error);
                setMessage(`Error: ${error.message || 'An unknown error occurred during processing.'}`);
            } finally {
                setLoading(false);
                setFile(null);
            }
        };

        reader.onerror = () => {
            setLoading(false);
            setMessage('Error reading file.');
        };

        reader.readAsBinaryString(file);
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Bulk QR Code Upload (Excel)</h2>
                <p className="mb-4 text-sm text-gray-600">
                    <span className="font-semibold">Required Columns:</span> Lattitude, Longitude, Police Station. Duty Point is optional.
                </p>

                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="mb-4 block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:text-sm file:font-semibold
                               file:bg-violet-50 file:text-violet-700
                               hover:file:bg-violet-100"
                />

                {message && <p className={`mb-4 text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-blue-600'}`}>{message}</p>}

                <div className="flex justify-end space-x-4">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || loading}>
                        {loading ? 'Uploading...' : 'Process & Generate Bulk QR'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExcelUploadModal;






