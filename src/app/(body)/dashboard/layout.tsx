"use client";

import React, { useEffect, useState } from 'react';

// Define the structure of the tab navigation items
interface TabItem {
    title: string;
    url: string;
}

const tabs: TabItem[] = [
    // Paths are absolute
    { title: "Users Dashboard", url: "/dashboard/user" },
    { title: "QR Dashboard", url: "/dashboard/qr-code" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Simulate usePathname by reading the browser's path
    const [currentPath, setCurrentPath] = useState('/');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentPath(window.location.pathname);

            const handleLocationChange = () => {
                setCurrentPath(window.location.pathname);
            };
            window.addEventListener('popstate', handleLocationChange);

            return () => {
                window.removeEventListener('popstate', handleLocationChange);
            };
        }
    }, []);

    const getLinkClasses = (url: string) => {
        // Logic: Check if currentPath matches the tab URL or is a sub-path of it
        const isActive = currentPath === url || currentPath.startsWith(`${url}/`);

        return `
            flex-1 text-center py-3 px-6 rounded-xl transition-all duration-200 font-medium whitespace-nowrap mb-2 sm:mb-0
            ${isActive
                ? 'bg-gray-600 text-white shadow-md'
                : 'bg-transparent text-gray-800 hover:text-indigo-600 hover:bg-gray-50'
            }
            sm:flex-none sm:w-auto
        `;
    };

    return (
        <div className="min-h-screen bg-gray-200 sm:p-4">
            <div className=" flex mb-2 justify-center">
                {/* Tabs Container */}
                <div className="bg-gray-300 rounded-xl shadow-sm p-1.5 inline-flex flex-col sm:flex-row">
                    <nav className="flex flex-col sm:flex-row sm:space-x-1">
                        {tabs.map((tab) => (
                            <a
                                key={tab.url}
                                href={tab.url}
                                className={getLinkClasses(tab.url)}
                                onClick={() => setCurrentPath(tab.url)}
                            >
                                {tab.title}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="bg-gray-200 rounded-xl shadow-xl min-h-[60vh] p-6">
                {children}
            </div>
        </div>
    );
}