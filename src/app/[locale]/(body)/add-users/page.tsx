"use client";

import { Button } from "@/components/ui/button";
import DropDown from "@/components/ui/DropDown";
import InputComponent from "@/components/ui/InputComponent";
import { useAuthStore, USER_DATA_KEY } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { useEffect, useState } from "react";
import CreateUsers from "./CreateUsers";

// Define the interface for bulk user data (must match the modal's ExcelUserData)
interface BulkUserData {
    name: string;
    pnoNo: string;
    password: string;
    co: string,
    policeStation: string
}

const CreateUsersPage = () => {
    // --- State and Store Hooks ---
    const { userData } = useAuthStore()
    const [name, setName] = useState<string>("")
    const [pnoNo, setPnoNo] = useState<string>("")
    const [co, setCO] = useState<string>("")
    const [policeStation, setPoliceStation] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [isModalOpen, setIsModalOpen] = useState(false) // State for modal visibility

    // NOTE: Assuming useUserStore was updated to use 'createUserOrBulk'
    // If not, you must rename 'createUsers' to 'createUserOrBulk' in your store
    const { createUsers } = useUserStore()
    const { selectedUser, updateUser } = useUserStore()




    const populateForm = () => {
        if (selectedUser) {
            setName(selectedUser.name)
            setPnoNo(selectedUser.pnoNo)

        }
    }
    // --- Helper to get Admin ID ---
    const getAdminId = (): string | undefined => {
        // Ensure this key matches your actual localStorage key
        const admin = localStorage.getItem(USER_DATA_KEY)
        if (!admin) {
            return undefined
        }
        try {
            const parsedData = JSON.parse(admin)
            // Assuming the ID is directly on the user data object
            return parsedData?.id
        } catch (e) {
            console.error("Failed to parse admin data from localStorage:", e)
            return undefined
        }
    }

    const clearForm = () => {
        setName("");
        setPnoNo("");
        setPassword("");
        setCO("")
        setPoliceStation("")
    }

    // --- Single User Creation Handler ---
    const handleGenerate = async () => {
        try {
            const adminId = getAdminId()
            if (!adminId) {
                alert("Admin ID not found. Cannot create user.")
                return
            }

            // Simple validation
            if (!name || !pnoNo || !co || !policeStation) {
                alert("Please fill all fields: Name, PNo No, Password, CO, and Police Station.")
                return;
            }

            const sentData = {
                name: name,
                pnoNo: pnoNo,
                password: password,
                co: co,
                policeStation: policeStation
            }

            // Call the store action for a single user
            // NOTE: Assumes createUsers handles a single object correctly
            if (selectedUser) {

                await updateUser({
                    co: co,
                    policeStation: policeStation
                }, selectedUser.id)
                clearForm()
            }
            else {
                await createUsers(sentData, adminId)
                // Clear form fields on success
                clearForm
                alert("User created successfully!")
            }


        } catch (error) {
            console.error(error)
            alert("Failed to create user. Check console for details.")
        }
    }

    // --- Bulk User Creation Handler ---
    const handleBulkUpload = async (data: BulkUserData[]) => {
        try {
            if (data.length === 0) {
                alert("No valid user data found in the file.")
                return
            }

            const adminId = getAdminId()
            if (!adminId) {
                alert("Admin ID not found. Cannot perform bulk signup.")
                return
            }

            // Call the store action for bulk users
            // NOTE: Assumes createUsers handles an array of objects correctly
            await createUsers(data, adminId)
            alert(`${data.length} users uploaded successfully!`)


        } catch (error) {
            console.error("Bulk upload error:", error)
            alert("Failed to perform bulk upload. Check console for details.")
        } finally {
            setIsModalOpen(false); // Close modal regardless of success/failure
        }
    }


    // --- Dropdown Options Data ---
    const coOptions = [
        { label: "Select CO", value: "" }, // Added default/placeholder
        { label: "City", value: "city" },
        { label: "Kairana", value: "kairana" },
        { label: "Thanabhawan", value: "thanabhawan" },
    ]

    const cityPsOptions = [
        { label: "Select Police Station", value: "" }, // Added default/placeholder
        { label: "Shamli", value: "shamli" },
        { label: "Adarsh Mandi", value: "adarshMandi" },
    ]

    const kairanaPSoptions = [
        { label: "Select Police Station", value: "" }, // Added default/placeholder
        { label: "Kairana", value: "kairana" },
        { label: "Jhinjana", value: "jhinjhana" },
        { label: "Kandhala", value: "kandhala" },
    ]

    const thanabhawanPSOptions = [
        { label: "Select Police Station", value: "" }, // Added default/placeholder
        { label: "Thanabhawan", value: "thanabhawan" },
        { label: "Babri", value: "babri" },
        { label: "Garipukhta", value: "garipukhta" },
    ]

    /**
     * Helper to determine which PS options to display based on the selected CO.
     * Also resets policeStation when CO changes to ensure data consistency.
     */
    const handleCOSelect = (newCO: string) => {
        setCO(newCO);
        // Reset the Police Station selection whenever CO changes
        setPoliceStation("");
    }


    useEffect(() => {
        populateForm()
    }, [])


    /**
     * Determines the correct list of Police Station options based on the current CO.
     */
    const getPoliceStationOptions = () => {
        switch (co) {
            case "city":
                return cityPsOptions;
            case "kairana":
                return kairanaPSoptions;
            case "thanabhawan":
                return thanabhawanPSOptions;
            default:
                // Return a list with only the placeholder if no CO is selected or if the value is unexpected
                return [{ label: "Select CO first", value: "" }];
        }
    }
    // --- End Dropdown Logic ---


    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">

            {/* Modal for Bulk Upload */}
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

                {/* Bulk Upload Button */}
                <div className="flex justify-end mb-4">
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        variant="default" // Using default, but you might want a distinct style
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        ⬆️ Bulk Upload (Excel/CSV)
                    </Button>
                </div>

                {/* Single User Creation Form */}
                <div className="bg-white shadow-xl border border-gray-200 p-8 rounded-xl flex flex-col gap-4">
                    <h2 className="text-xl font-semibold mb-2 text-gray-700">Single User Entry</h2>

                    <InputComponent label="Name" value={name} setInput={setName} />
                    <InputComponent label="PNo No" value={pnoNo} setInput={setPnoNo} type="text" />

                    <InputComponent disabled={selectedUser ? true : false} label="Password" value={password} setInput={setPassword} type="password" />


                    <DropDown
                        label="Select CO"
                        options={coOptions}
                        selectedValue={co}
                        handleSelect={handleCOSelect} // Use helper to also clear policeStation
                    />

                    {/* 2. Police Station DropDown (Conditionally Rendered based on CO) */}
                    <DropDown
                        label="Select Police Station"
                        options={getPoliceStationOptions()}
                        selectedValue={policeStation}
                        handleSelect={setPoliceStation}
                        // Disable if no valid CO is selected
                        disabled={co === ""}
                    />

                    <div className="flex justify-center mt-4">
                        <Button onClick={handleGenerate} className="w-1/3">Create User</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreateUsersPage