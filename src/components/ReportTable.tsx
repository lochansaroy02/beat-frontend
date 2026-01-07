
const ReportTable = ({ phase, filteredRows, isLoading, stats }) => {
    

    return (

        <div>

            {/* Main Table Card */}
            <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                <th className="p-6 sticky left-0 bg-slate-50 z-30 border-r border-slate-200 min-w-[200px]">Police Station</th>
                                {phase.map((p) => (
                                    <th key={p.label} className="p-4 text-center border-r border-slate-200/60">{p.label}</th>
                                ))}
                                <th className="p-4 text-center bg-indigo-50 text-indigo-700">Grand Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-6"><div className="h-4 bg-slate-100 rounded w-3/4"></div></td>
                                        {phase.map((_, j) => (
                                            <td key={j} className="p-4"><div className="h-8 bg-slate-50 rounded-xl w-10 mx-auto"></div></td>
                                        ))}
                                        <td className="p-4"><div className="h-4 bg-indigo-50 rounded w-10 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredRows.length > 0 ? (
                                filteredRows.map((station) => {
                                    const stationKey = station.toLowerCase();
                                    let stationTotal = 0;
                                    return (
                                        <tr key={station} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-6 font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r border-slate-200 capitalize">
                                                {station}
                                            </td>
                                            {phase.map((p) => {
                                                //@
                                                const count = stats[stationKey]?.[p.label] || 0;
                                                stationTotal += count;
                                                return (
                                                    <td key={p.label} className="p-4 text-center border-r border-slate-200/40">
                                                        <span className={`inline-flex items-center justify-center min-w-[2.8rem] px-3 py-2 rounded-xl text-xs font-mono font-black border transition-all ${count >= 15 ? "bg-rose-50 text-rose-600 border-rose-100"
                                                            : count >= 10 ? "bg-amber-50 text-amber-600 border-amber-100"
                                                                : count > 0 ? "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm"
                                                                    : "text-slate-300 border-transparent"
                                                            }`}>
                                                            {count}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-center font-black text-slate-900 bg-slate-50/50 group-hover:bg-indigo-50/50">
                                                {stationTotal}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={10} className="p-20 text-center text-slate-400 font-medium">
                                        No police stations found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default ReportTable