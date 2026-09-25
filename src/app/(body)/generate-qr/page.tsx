"use client";
import ExcelUploadModal from "@/components/src/components/ExcelUploadModal";
import { Button } from "@/components/ui/button";
import DropDown from "@/components/ui/DropDown";
import InputComponent from "@/components/ui/InputComponent";
import { useQRstore } from "@/store/qrStore";
import { catagoryArr } from "@/utils/constatns";
import { generatePdfWithQRCodes, generateSingleQrcodeUrl } from "@/utils/genetateQR";
import { useState } from "react";
import toast from "react-hot-toast";

const Page = () => {
    const [lat, setLat] = useState("");
    const [long, setLong] = useState("");
    const [policeStation, setPoliceStation] = useState("");
    const [dutyPoint, setDutyPoint] = useState("");
    const [catagory, setCatagory] = useState("");
    const [cug, setCug] = useState("");

    const [url, setUrl] = useState(""); // For UI Preview
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const { createQR } = useQRstore();

    const handleGenerate = async () => {
        // Validation: Note we check 'catagory' as well
        if (!lat || !long || !policeStation || !dutyPoint || !catagory) {
            toast.error("Please fill all fields including Category.");
            return;
        }

        setIsGenerating(true);
        const loadingToast = toast.loading("Saving to database and generating PDF...");

        try {
            const sentData = {
                lattitude: lat, // Key matches Backend
                longitude: long,
                policeStation: policeStation,
                dutyPoint: dutyPoint,
                catagory: catagory, // Key matches Backend
            };

            // 1. Save to Database
            const result = await createQR(sentData);

            if (result && (result.success || result.data)) {
                // 2. Success: Generate Preview for the browser
                const qrPreviewUrl = await generateSingleQrcodeUrl(sentData);
                setUrl(qrPreviewUrl);

                // 3. Generate and Download the PDF
                const fileName = `QR_${dutyPoint.replace(/\s+/g, '_')}.pdf`;
                await generatePdfWithQRCodes([sentData], fileName);

                toast.success("Success! QR saved and PDF downloaded.", { id: loadingToast });

                // Optional: Clear form
                setDutyPoint("");
            } else {
                // Handle specific backend errors (like the 501 Already Exists)
                const errorMsg = result?.message || "Failed to save QR to database.";
                toast.error(errorMsg, { id: loadingToast });
            }
        } catch (error: any) {
            console.error("Process Error:", error);
            toast.error("An unexpected error occurred.", { id: loadingToast });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex items-center pt-8 flex-col pb-10">
            <h1 className="text-4xl text-neutral-900 font-bold mb-10">Generate QR Code</h1>

            <div className="w-full max-w-2xl flex bg-neutral-200 border border-neutral-300 p-8 rounded-2xl shadow-2xl flex-col gap-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-neutral-700">Manual Entry</h2>
                    <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                        Bulk Upload (Excel)
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputComponent label="Latitude" value={lat} setInput={setLat} type="number" />
                    <InputComponent label="Longitude" value={long} setInput={setLong} type="number" />
                </div>

                <InputComponent label="Police Station Name" value={policeStation} setInput={setPoliceStation} />
                <InputComponent label="Duty Point Name" value={dutyPoint} setInput={setDutyPoint} />

                <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Point Category</label>
                    <DropDown options={catagoryArr} selectedValue={catagory} handleSelect={setCatagory} />
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-bold"
                >
                    {isGenerating ? "Processing..." : "Create QR & Download PDF"}
                </Button>
            </div>

            {/* UI Preview Section */}
            {url && (
                <div className="mt-10 p-6 bg-white rounded-xl shadow-lg border flex flex-col items-center">
                    <p className="text-sm font-bold text-indigo-600 mb-4 uppercase">Success Preview</p>
                    <img src={url} alt="QR Preview" className="w-48 h-48 border p-2 rounded-lg" />
                    <p className="mt-4 text-xs text-neutral-400 font-medium">Data has been secured in the Digital Malkhana database.</p>
                </div>
            )}

            <ExcelUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default Page;