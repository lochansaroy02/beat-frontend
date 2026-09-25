"use client";

import { Button } from "@/components/ui/button";
import DropDown from "@/components/ui/DropDown";
import InputComponent from "@/components/ui/InputComponent";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { coOptions, getPoliceStationOptions } from "@/utils/constatns";
import { Loader2 } from "lucide-react";
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
    const [isLoading, setIsLoading] = useState(false);

    const { createUsers, selectedUser, updateUser } = useUserStore();

    useEffect(() => {
        if (selectedUser) {
            setName(selectedUser.name || "");
            setPnoNo(selectedUser.pnoNo || "");
            setCO(selectedUser.co || "");
            setPoliceStation(selectedUser.policeStation || "");
        }
    }, [selectedUser]);

    const clearForm = () => {
        setName("");
        setPnoNo("");
        setPassword("");
        setCO("");
        setPoliceStation("");
    };

    const handleGenerate = async () => {
        const adminId = userData?.id;

        if (!adminId) {
            toast.error("Admin ID not found.");
            return;
        }

        if (!name || !pnoNo || (!selectedUser && !password) || !co || !policeStation) {
            toast.error("Please fill all required fields.");
            return;
        }

        setIsLoading(true);
        try {
            if (selectedUser) {
                await updateUser({ co, policeStation, name, pnoNo }, selectedUser.id);
                clearForm();
            } else {
                const payload = [{
                    name,
                    pnoNo,
                    password,
                    co,
                    policeStation,
                    adminId // Included in body as well if your backend needs it
                }];

                // CRITICAL FIX: Passing adminId (string), not userData (object)
                await createUsers(payload, adminId);
                clearForm();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkUpload = async (data: any[]) => {
        const adminId = userData?.id;
        if (!adminId || data.length === 0) return;

        setIsLoading(true);
        try {
            // Mapping data to ensure adminId is attached to every record if required
            const formattedData = data.map(user => ({ ...user, adminId }));
            await createUsers(formattedData, adminId);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Bulk upload error:", error);
        } finally {
            setIsLoading(false);
        }
    };

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
                    <InputComponent label="PNo No" value={pnoNo} setInput={setPnoNo} />

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
                        handleSelect={(val) => { setCO(val); setPoliceStation(""); }}
                    />

                    <DropDown
                        label="Select Police Station"
                        options={getPoliceStationOptions(co)}
                        selectedValue={policeStation}
                        handleSelect={setPoliceStation}
                        disabled={!co}
                    />

                    <div className="flex justify-center mt-4">
                        <Button
                            onClick={handleGenerate}
                            className="w-1/3"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</>
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