"use client";

import { Button } from "@/components/ui/button";
import DropDown from "@/components/ui/DropDown";
import InputComponent from "@/components/ui/InputComponent";
import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
const page = () => {

    const [name, setName] = useState("");
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("");

    const roleOptions = [
        { value: "sho", label: "SHO" },
        { value: "co", label: "All Circle" },
        { value: "asp", label: "ASP" },
    ]


    const handleGenerate = async () => {
        try {
            const sentData = {
                name: name,
                role: role,
                mobileNo: mobile,
                password: password
            }
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/subAdmin/create`, sentData)
            const data = response.data
            console.log(data);
            if (data.success) {
                toast.success("subAdmin Created")
            }

        } catch (error) {
            console.log(error);
        }
    }
    return (
        <div className=" flex justify-center items-center">

            <div className="bg-white w-3/4  mt-18  shadow-xl border border-gray-200 p-8 rounded-xl flex flex-col gap-4">
                <h2 className="text-xl font-semibold mb-2 text-gray-700">Add Sub Admin</h2>
                <DropDown options={roleOptions} label="Role" handleSelect={setRole} selectedValue={role} />
                <InputComponent label="Name" value={name} setInput={setName} type="text" />
                <InputComponent label="Mobile No" value={mobile} setInput={setMobile} type="text" />
                <InputComponent label="Password" value={password} setInput={setPassword} type="password" />

                <div className="flex justify-center mt-4">
                    <Button onClick={handleGenerate} className="w-1/3">Create User</Button>
                </div>
            </div>
        </div>
    )
}

export default page