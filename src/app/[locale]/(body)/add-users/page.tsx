"use client";

import { Button } from "@/components/ui/button";
import DropDown from "@/components/ui/DropDown";
import InputComponent from "@/components/ui/InputComponent";
import { useAuthStore, USER_DATA_KEY } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { Loader2 } from "lucide-react"; // Assuming you use lucide-react for icons
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import CreateUsers from "./CreateUsers";


const CreateUsersPage = () => {
    const { userData } = useAuthStore();
    const [name, setName] = useState<string>("");
    const [pnoNo, setPnoNo] = useState<string>("");
    const [co, setCO] = useState<string>("");
    const [policeStation, setPoliceStation] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Added loading state
    const [isLoading, setIsLoading] = useState(false);

    const { createUsers, selectedUser, updateUser } = useUserStore();

    const populateForm = () => {
        if (selectedUser) {
            setName(selectedUser.name);
            setPnoNo(selectedUser.pnoNo);
            // Optionally populate co and policeStation if they exist on selectedUser
            setCO(selectedUser.co || "");
            setPoliceStation(selectedUser.policeStation || "");
        }
    };

    const getAdminId = (): string | undefined => {
        const admin = localStorage.getItem(USER_DATA_KEY);
        if (!admin) return undefined;
        try {
            const parsedData = JSON.parse(admin);
            return parsedData?.id;
        } catch (e) {
            console.error("Failed to parse admin data:", e);
            return undefined;
        }
    };

    const clearForm = () => {
        setName("");
        setPnoNo("");
        setPassword("");
        setCO("");
        setPoliceStation("");
    };

    const handleGenerate = async () => {
        const adminId = getAdminId();
        if (!adminId) {
            alert("Admin ID not found. Cannot create user.");
            return;
        }

        if (!name || !pnoNo || (!selectedUser && !password) || !co || !policeStation) {
            alert("Please fill all required fields.");
            return;
        }

        setIsLoading(true); // Start Loader
        try {
            if (selectedUser) {
                await updateUser({
                    co: co,
                    policeStation: policeStation
                }, selectedUser.id);
                alert("User updated successfully!");
                clearForm();
            } else {
                const sentData = {
                    name: name,
                    pnoNo: pnoNo,
                    password: password,
                    co: co,
                    policeStation: policeStation
                };

                console.log(sentData);

                // FIX: Pass as an array [sentData] to match the 'Bulk' expectations of the store
                await createUsers([sentData as any], adminId);

                toast("User created successfully!");
                clearForm(); // Fixed: added parentheses
            }
        } catch (error) {
            console.error(error);
            alert("Action failed. Check console for details.");
        } finally {
            setIsLoading(false); // Stop Loader
        }
    };

    const handleBulkUpload = async (data: any[]) => {
        if (data.length === 0) {
            alert("No valid user data found.");
            return;
        }

        const adminId = getAdminId();
        if (!adminId) return;

        setIsLoading(true);
        try {
            await createUsers(data, adminId);
            alert(`${data.length} users uploaded successfully!`);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Bulk upload error:", error);
            alert("Bulk upload failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const coOptions = [
        { label: "Select CO", value: "" },
        { label: "City", value: "city" },
        { label: "Kairana", value: "kairana" },
        { label: "Thanabhawan", value: "thanabhawan" },
    ];

    const getPoliceStationOptions = () => {
        switch (co) {
            case "city":
                return [
                    { label: "Select Police Station", value: "" },
                    { label: "Shamli", value: "shamli" },
                    { label: "Adarsh Mandi", value: "adarshMandi" },
                ];
            case "kairana":
                return [
                    { label: "Select Police Station", value: "" },
                    { label: "Kairana", value: "kairana" },
                    { label: "Jhinjana", value: "jhinjhana" },
                    { label: "Kandhala", value: "kandhala" },
                ];
            case "thanabhawan":
                return [
                    { label: "Select Police Station", value: "" },
                    { label: "Thanabhawan", value: "thanabhawan" },
                    { label: "Babri", value: "babri" },
                    { label: "Garipukhta", value: "garipukhta" },
                ];
            default:
                return [{ label: "Select CO first", value: "" }];
        }
    };

    const handleCOSelect = (newCO: string) => {
        setCO(newCO);
        setPoliceStation("");
    };

    useEffect(() => {
        populateForm();
    }, [selectedUser]); // Added selectedUser as dependency

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
            <CreateUsers
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpload={handleBulkUpload}
            />

            <div className="my-4 text-center">
                <h1 className="text-3xl font-bold text-gray-800">Create Users</h1>
                <p className="text-sm text-gray-500 mt-1">Single entry or bulk upload</p>
            </div>

            <div className="w-full max-w-2xl mt-8">
                <div className="flex justify-end mb-4">
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        ⬆️ Bulk Upload (Excel/CSV)
                    </Button>
                </div>

                <div className="bg-white shadow-xl border border-gray-200 p-8 rounded-xl flex flex-col gap-4">
                    <h2 className="text-xl font-semibold mb-2 text-gray-700">
                        {selectedUser ? "Update User" : "Single User Entry"}
                    </h2>

                    <InputComponent label="Name" value={name} setInput={setName} />
                    <InputComponent label="PNo No" value={pnoNo} setInput={setPnoNo} type="text" />

                    {!selectedUser && (
                        <InputComponent
                            label="Password"
                            value={password}
                            setInput={setPassword}
                            type="password"
                        />
                    )}

                    <DropDown
                        label="Select CO"
                        options={coOptions}
                        selectedValue={co}
                        handleSelect={handleCOSelect}
                    />

                    <DropDown
                        label="Select Police Station"
                        options={getPoliceStationOptions()}
                        selectedValue={policeStation}
                        handleSelect={setPoliceStation}
                        disabled={co === ""}
                    />

                    <div className="flex justify-center mt-4">
                        <Button
                            onClick={handleGenerate}
                            className="w-1/3"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Please wait
                                </>
                            ) : (
                                selectedUser ? "Update User" : "Create User"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateUsersPage;