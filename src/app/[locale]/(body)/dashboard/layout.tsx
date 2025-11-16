"use client";

import React, { useEffect, useState } from 'react';

// Define the structure of the tab navigation items
interface TabItem {
    title: string;
    url: string;
}

const tabs: TabItem[] = [
    // Paths are absolute: /dashboard/users and /dashboard/qr-code
    { title: "Users Dashboard", url: "/dashboard/user" },
    { title: "QR Dashboard", url: "/dashboard/qr-code" },
];

/**
 * Main dashboard layout component with persistent tab navigation.
 * Uses client-side logic (window.location) to simulate Next.js path detection
 * since Next.js hooks like usePathname are unavailable in this sandbox environment.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Simulate usePathname by reading the browser's path
    const [currentPath, setCurrentPath] = useState('/');

    useEffect(() => {
        // Run only on the client side
        if (typeof window !== 'undefined') {
            setCurrentPath(window.location.pathname);

            // Add listener for browser history changes (like back/forward buttons)
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
        // Check if the current path starts with the tab's URL to determine active state
        // This is robust for nested paths like /dashboard/user/profile
        const isActive = currentPath.startsWith(url);
        return `
            flex-1 text-center py-3 px-6 rounded-lg transition-all duration-300 font-medium whitespace-nowrap
            ${isActive
                ? 'bg-indigo-600 text-white border-b-2 border-indigo-500 shadow-md' // Active state 
                : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100 border-b-2 border-transparent' // Inactive state styling
            }
            sm:flex-none sm:w-auto
        `;
    };

    return (
        <div className="min-h-screen bg-gray-100  sm:p-8">
            <header className="mb-2  flex justify-center bg-white rounded-xl shadow-xl ">

                {/* Tabs Container */}
                <nav className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 mt-4 border-b border-gray-200">
                    {tabs.map((tab) => (
                        <a
                            key={tab.url}
                            href={tab.url} // Replaced <Link> with standard <a>
                            className={getLinkClasses(tab.url)}
                            // 👇 FIX APPLIED: Removed the manual setCurrentPath
                            onClick={() => { setCurrentPath(tab.url); }}
                        >
                            {tab.title}
                        </a>
                    ))}
                </nav>
            </header>


            <main className=" bg-white rounded-xl shadow-xl  min-h-[60vh]">
                {children}
            </main>
        </div>
    );
}