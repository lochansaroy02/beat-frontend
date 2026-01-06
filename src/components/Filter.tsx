
"use client";

import DatePicker from "@/components/ui/datePicker";
import InputComponent from "@/components/ui/InputComponent";
import { usePersonStore } from "@/store/personStore";
import { coOptions, getPoliceStationOptions } from "@/utils/constatns";
import { Calendar, ClipboardList, Clock, Filter as FilterIcon, Loader2, MapPin, Search } from "lucide-react";
import React, { useState } from "react";
import DropDown from "./ui/DropDown";

export interface TimePhase { label: string; startHour: number; endHour: number; }
export const TIME_PHASES: TimePhase[] = [
    { label: "Day Phase 1 (6AM - 9AM)", startHour: 6, endHour: 9 },
    { label: "Day Phase 2 (9AM - 12PM)", startHour: 9, endHour: 12 },
    { label: "Day Phase 3 (12PM - 3PM)", startHour: 12, endHour: 15 },
    { label: "Day Phase 4 (3PM - 6PM)", startHour: 15, endHour: 18 },
    { label: "Night Phase 1 (6PM - 9PM)", startHour: 18, endHour: 21 },
    { label: "Night Phase 2 (9PM - 12AM)", startHour: 21, endHour: 0 },
    { label: "Night Phase 3 (12AM - 3AM)", startHour: 0, endHour: 3 },
    { label: "Night Phase 4 (3AM - 6AM)", startHour: 3, endHour: 6 },
];

interface FilterProps {
    startDate: string | undefined;
    setStartDate: (date: string | undefined) => void;
    endDate: string | undefined;
    setEndDate: (date: string | undefined) => void;
    selectedPoliceStation: string;
    setSelectedPoliceStation: (station: string) => void;
    uniquePoliceStations: string[];
    selectedTimePhase: string;
    setSelectedTimePhase: (phase: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onGenerateReport: () => void;
    isGeneratingReport: boolean;
}

const Filter: React.FC<FilterProps> = ({
    startDate, setStartDate,
    endDate, setEndDate,
    selectedPoliceStation, setSelectedPoliceStation,
    uniquePoliceStations,
    selectedTimePhase, setSelectedTimePhase,
    searchQuery, setSearchQuery,
    onGenerateReport,
    isGeneratingReport
}) => {

    const [co, setCO] = useState<string>("");
    const [policeStations, setPoliceStations] = useState<any>([]);
    const [policeStation, setPoliceStation] = useState<any>([]);
    const { personData } = usePersonStore()

    const handleCOSelect = (newCO: string) => {
        setCO(newCO);
        setPoliceStation("");
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-6 shadow-xl backdrop-blur-md dark:border-gray-800/30 dark:bg-gray-900/60">
            {/* Decorative Header */}
            <div className="mb-6 flex items-center gap-2 border-b border-gray-200/50 pb-4 dark:border-gray-700/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <FilterIcon size={18} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 dark:text-gray-200">
                    Matrix Filters
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

                {/* 1. Temporal Group (Date & Phase) */}
                <div className="flex flex-col gap-4 lg:col-span-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase">
                        <Calendar size={14} /> Duration & Timing
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DatePicker label="From" date={startDate} setDate={setStartDate} />
                        <DatePicker label="To" date={endDate} setDate={setEndDate} />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                            <Clock size={12} /> Time Phase
                        </label>
                        <select
                            value={selectedTimePhase}
                            onChange={(e) => setSelectedTimePhase(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                        >
                            <option value="">All Time Phases</option>
                            {TIME_PHASES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Vertical Divider for Desktop */}
                <div className="hidden lg:block w-px bg-gray-200/50 dark:bg-gray-700/50 h-full lg:col-span-1 mx-auto" />

                {/* 2. Administrative & Search Group */}
                <div className="flex flex-col gap-4 lg:col-span-6">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase">
                        <MapPin size={14} /> Scope & Search
                    </div>
                    <div className=" grid grid-cols-2 gap-2 ">

                        <DropDown
                            label="Select CO"
                            options={coOptions}
                            selectedValue={co}
                            handleSelect={handleCOSelect}
                        />

                        <DropDown
                            label="Select Police Station"
                            options={getPoliceStationOptions(co)}
                            selectedValue={policeStation}
                            handleSelect={setPoliceStation}
                            disabled={co === ""}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="w-full">
                            <label className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                                <Search size={12} /> Quick Search
                            </label>
                            <InputComponent
                                customPlaceholder="Search name, PNO..."
                                value={searchQuery}
                                setInput={setSearchQuery}
                                className="w-full"
                            />
                        </div>

                        <button
                            onClick={onGenerateReport}
                            disabled={isGeneratingReport}
                            className={`flex h-10 w-full cursor-pointer sm:w-auto items-center justify-center gap-2 rounded-lg px-6 font-semibold text-white transition-all shadow-lg active:scale-95 
                                ${isGeneratingReport
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/25'
                                }`}
                        >
                            {isGeneratingReport ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <ClipboardList size={18} />
                            )}
                            <span className="whitespace-nowrap text-sm">
                                {isGeneratingReport ? "Processing..." : "Generate Matrix"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Filter;


