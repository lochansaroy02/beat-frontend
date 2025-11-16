"use client";

import Logo from '@/assets/Logo';
import { useAuthStore } from '@/store/authStore';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

const Sidebar = () => {
    const { userData } = useAuthStore()
    const path = usePathname();
    const router = useRouter();
    const t = useTranslations("Sidebar");

    const sidebarData = useMemo(() => {
        const baseRoutes = [
            { name: "Dashboard", link: "/dashboard" },
            // { name: t("dashboard"), link: "/dashboard" },
            { name: "Generate QR", link: "/generate-qr" },
            { name: "Add User", link: "/add-users" },
            { name: "Add Sub Admin", link: "/add-subadmin" },
            // { name: "Map", link: "/map" },

        ];
        return baseRoutes;
    }, []);

    return (
        <div className={`    h-screen lg:flex transition-all ease-in-out duration-300 z-40 w-1/5  lg:pt-0 pt-18 fixed lg:glass-effect border border-neutral-800/50 rounded-xl bg-neutral-200 `}>
            <div className='p-4 h-full w-full flex gap-4 flex-col'>
                <div className='flex justify-center'>
                    <Logo width={100} height={100} />
                </div>
                <div className='flex flex-col justify-between   h-full lg:gap-10 gap-6'>
                    <div className='gap-2 flex flex-col'>
                        {sidebarData.map((item, index) => {
                            if (!item) return null;
                            const baseLink = item.link.split('/').pop() || item.link;
                            const isActive = path.includes(baseLink);
                            return (
                                <div
                                    key={index}
                                    onClick={() => {
                                        // For reports, navigate to the default entry report page
                                        const targetLink = item.link === '/report' ? '/report/entry-report' : item.link;
                                        router.push(targetLink);
                                    }}
                                    // 💡 MODIFICATION:
                                    // 1. Maintain 'bg-green-700' for active state.
                                    // 2. Add 'hover:bg-green-600' for a nice hover effect on inactive items.
                                    // 3. Set a specific text color for active and inactive states.
                                    className={`${isActive ? "bg-green-700" : "bg-neutral-800 hover:bg-neutral-700"} cursor-pointer py-2 px-4 transition-all ease-in-out rounded-lg`}
                                >
                                    <h1 className={`${isActive ? 'text-neutral-200 font-semibold' : 'text-neutral-400'} text-sm`}>{item.name}</h1>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Sidebar;