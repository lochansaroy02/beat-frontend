"use client";
import ExcelUploadModal from "@/components/src/components/ExcelUploadModal";
import { Button } from "@/components/ui/button";
import DropDown from "@/components/ui/DropDown";
import InputComponent from "@/components/ui/InputComponent";
import { useQRstore } from "@/store/qrStore";
import { generateQrcode } from "@/utils/genetateQR";
import axios from "axios";
import { useState } from "react";

const Page = () => {
    const [lat, setLat] = useState("");
    const [long, setLong] = useState("");
    const [policeStation, setPoliceStation] = useState("");
    const [dutyPoint, setDutyPoint] = useState("");
    const [catagory, setCatagory] = useState("")
    const [cug, setCug] = useState("");

    const [url, setUrl] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

    // ✅ validation states
    const [latError, setLatError] = useState("");
    const [longError, setLongError] = useState("");
    const [address, setAddress] = useState(null);

    const { createQR } = useQRstore()

    const validateLatitude = (val: string) => {
        const num = Number(val);
        if (val === "") return "Latitude is required";
        if (isNaN(num)) return "Latitude must be a number";
        if (num < -90 || num > 90) return "Latitude must be between -90 and 90";
        return "";
    };

    const validateLongitude = (val: string) => {
        const num = Number(val);
        if (val === "") return "Longitude is required";
        if (isNaN(num)) return "Longitude must be a number";
        if (num < -180 || num > 180) return "Longitude must be between -180 and 180";
        return "";
    };

    const handleLatChange = (val: string) => {
        setLat(val);
        setLatError(validateLatitude(val));
    };

    const handleLongChange = (val: string) => {
        setLong(val);
        setLongError(validateLongitude(val));
    };



    const cordToAddress = async (lat: string, long: string) => {
        try {
            const response = await axios.get(`https://geocode.maps.co/reverse?lat=${lat}&lon=${long}&api_key=${process.env.NEXT_PUBLIC_FREE_MAP_API_KEY}`)
            setAddress(response.data.address);
        } catch (error) {
            console.error("Geocoding error:", error);
        }
    }

    const handleGenerate = async () => {
        // Run final validation check
        const finalLatError = validateLatitude(lat);
        const finalLongError = validateLongitude(long);

        setLatError(finalLatError);
        setLongError(finalLongError);

        if (finalLatError || finalLongError || !policeStation) {
            alert("Please correct the errors and fill all fields.");
            return;
        }
        await cordToAddress(lat, long)
        const sentData = {
            lattitude: lat,
            longitude: long,
            policeStation: policeStation,
            dutyPoint: dutyPoint,
            cug: cug,
            catagory: catagory
        };


        try {
            const url = await generateQrcode(sentData);
            //@ts-ignore
            setUrl(url);
            const data = await createQR(sentData)

            alert("Single QR code generated successfully!");

        } catch (error) {
            console.error(error);
            alert("Failed to generate QR code.");
        }
    };


    const catagoryArr = [
        {
            label: "Bank", value: "bank",

        },
        {
            label: "Patrol Pump", value: "petrolPump",

        },
        {
            label: "HS satyapan", value: "satyapan",

        },
        {
            label: "Gaushala", value: "gaushala",

        },
        {
            label: "Tubewell", value: "tubewell",

        },
        {
            label: "Religious Places", value: "religiousPlaces",

        },
        {
            label: "Sarafa", value: "sarafa",

        },
        {
            label: "wine shop", value: "wineShop",

        },
        {
            label: "Mafiya/ Nakabjan/ Taska", value: "mafia",
        },
        {
            label: "Other", value: "other",
        },

    ]


    // Handler to close the modal
    const handleModalClose = () => setIsModalOpen(false);


    return (
        <div className="h-full flex items-center pt-8  flex-col">
            <div className="w-full justify-center flex   ">
                <h1 className="text-4xl   text-neutral-900 font-bold">Generate QR Code</h1>
            </div>

            <div className="w-1/2 flex bg-neutral-300   border border-neutral-800/50  p-8 rounded-xl mt-12 flex-col gap-4">
                <div className="flex justify-end mb-4">
                    <Button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-700">
                        Upload from Excel 📊
                    </Button>
                </div>

                {/* Single Entry Form */}
                <h2 className="text-2xl font-semibold mb-2 text-center">Single Entry</h2>

                {/* Latitude */}
                <div>
                    <InputComponent
                        label="Latitude"
                        value={lat}
                        setInput={handleLatChange}
                        type="number"
                    />
                    {latError && <p className="text-red-500 text-sm">{latError}</p>}
                </div>

                {/* Longitude */}
                <div>
                    <InputComponent
                        label="Longitude"
                        value={long}
                        setInput={handleLongChange}
                        type="number"
                    />
                    {longError && <p className="text-red-500 text-sm">{longError}</p>}
                </div>

                {/* Police Station */}
                <InputComponent
                    label="Police Station"
                    value={policeStation}
                    setInput={setPoliceStation}
                />
                <div>
                    <InputComponent
                        label="CUG Number"
                        value={cug}
                        setInput={setCug}
                    />
                    {longError && <p className="text-red-500 text-sm">{longError}</p>}
                </div>
                <InputComponent
                    label="Duty Point"
                    value={dutyPoint}
                    setInput={setDutyPoint}
                />

                <div>
                    <label className="w-1/3 text-[14px] text-nowrap text-neutral-800" htmlFor="">Catagory</label>
                    <DropDown options={catagoryArr} selectedValue={catagory} handleSelect={setCatagory} />
                </div>
                <div className="flex  justify-center">
                    <Button onClick={handleGenerate}>Generate Single QR</Button>
                </div>
            </div>

            {/* QR Display */}
            <div>
                {url && (
                    <div className="mt-8 flex flex-col items-center p-6 border rounded-lg shadow-lg bg-white">
                        <h2 className="text-xl font-semibold mb-4">Scan Me!</h2>
                        <img
                            src={url}
                            alt="Generated QR Code"
                            className="w-64 h-64 border-4 border-gray-200"
                        />
                    </div>
                )}
            </div>

            {/* Excel Upload Modal */}
            <ExcelUploadModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
            />
        </div>
    );
};

export default Page;