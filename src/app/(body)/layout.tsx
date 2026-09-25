
"use client";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function BodyLayout({ children }: { children: React.ReactNode }) {

    return (
        <div>
            <div className=" ">
                <Header />
                <div className=" pt-16  flex   ">
                    <Sidebar />
                    <div className="pl-1/4 w-4/5 ml-[20%]">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
