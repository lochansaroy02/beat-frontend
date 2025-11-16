"use client";

import { Button } from "@/components/ui/button";
import React, { useState } from 'react';
import * as XLSX from 'xlsx';

// Define the structure of data expected from the Excel sheet
interface ExcelUserData {
    name: string;
    pnoNo: string;
    password: string;
    co: string,
    policeStation: string // Correct key name
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (data: ExcelUserData[]) => void;
}

const CreateUsers: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUploadClick = () => {
        if (!file) {
            alert("Please select a file first.");
            return;
        }

        setLoading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                // Read the workbook as binary
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert the sheet data to a JSON array.
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (json.length === 0) {
                    throw new Error("File is empty.");
                }

                const headers: string[] = json[0];
                const nameIndex = headers.indexOf('name');
                const pnoNoIndex = headers.indexOf('pnoNo');
                const passwordIndex = headers.indexOf('Password'); // Case-sensitive
                const coIndex = headers.indexOf('co')
                const policeStationIndex = headers.indexOf('policeStation')

                // 1. FIX: Use '||' (OR) to check if ANY required header index is -1 (not found)
                if (nameIndex === -1 || pnoNoIndex === -1 || passwordIndex === -1 || coIndex === -1 || policeStationIndex === -1) {
                    throw new Error("Missing required columns: 'name', 'pnoNo', 'Password' (case-sensitive), 'co', or 'policeStation'.");
                }

                // Map and validate the required fields from the data rows (starting from index 1)
                const formattedData: ExcelUserData[] = json.slice(1).map((row: any[]) => ({
                    // Explicitly cast all values to String and ensure correct column index is used
                    name: String(row[nameIndex] || ''),
                    pnoNo: String(row[pnoNoIndex] || ''),
                    password: String(row[passwordIndex] || ''),
                    co: String(row[coIndex] || ''),
                    policeStation: String(row[policeStationIndex] || ''),
                })).filter(user => user.name.trim() && user.pnoNo.trim() && user.password.trim());
                // NOTE: The filter only checks name, pnoNo, and password. You might want to include co and policeStation in the filter if they are strictly mandatory in the Excel sheet.

                if (formattedData.length === 0) {
                    throw new Error("No valid user data found in the file.");
                }
                console.log(formattedData);
                onUpload(formattedData);
                setLoading(false);
                setFile(null); // Clear file input
                onClose(); // Close modal on successful initiation

            } catch (error: any) {
                console.error("Error processing file:", error);
                alert(`Error processing file: ${error.message || "Please ensure it's a valid Excel/CSV file with all required columns."}`);
                setLoading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                <h2 className="text-xl font-bold mb-4">Bulk User Upload</h2>
                <p className="text-sm text-gray-600 mb-4">Upload an Excel or CSV file containing columns:
                    <span className="font-semibold ml-1">
                        name, pnoNo, Password, co, policeStation.
                    </span>
                    <span className="ml-1 italic text-red-500">
                        (Password is case-sensitive)
                    </span>
                </p>
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="mb-4 block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:text-sm file:font-semibold
                               file:bg-violet-50 file:text-violet-700
                               hover:file:bg-violet-100"
                />

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleUploadClick} disabled={loading || !file}>
                        {loading ? 'Processing...' : 'Upload & Create'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CreateUsers;