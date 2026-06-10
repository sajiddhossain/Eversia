import React from "react";
import { Search } from "lucide-react";

interface AdminMetricsProps {
    efficiency: number;
    presentStudentsCount: number;
    avgSaturation: number;
    actualPresent: number;
    pendingTotal: number;
    activitiesCount: number;
    onOpenPending: () => void;
}

export const AdminMetrics: React.FC<AdminMetricsProps> = ({
    efficiency,
    presentStudentsCount,
    avgSaturation,
    actualPresent,
    pendingTotal,
    activitiesCount,
    onOpenPending
}) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Participation Rate */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-primary/30 rounded-3xl p-6 md:p-8 relative overflow-hidden group transition-all duration-500 shadow-xl">
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <div className="text-primary/40 text-[10px] font-bold uppercase tracking-widest mb-6">Presenze Live</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter italic">{Math.round(efficiency)}%</span>
                        </div>
                    </div>
                    <div className="mt-8 flex items-center gap-4">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary shadow-[0_0_20px_rgba(226,243,60,0.6)] transition-all duration-1000 ease-out" style={{ width: `${efficiency}%` }} />
                        </div>
                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">{presentStudentsCount}</span>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-[60px] group-hover:bg-primary/10 transition-all duration-700" />
            </div>

            {/* Avg Saturation */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-amber-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden group transition-all duration-500 shadow-xl">
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <div className="text-amber-500/40 text-[10px] font-bold uppercase tracking-widest mb-6">Saturazione</div>
                        <span className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter italic">{Math.round(avgSaturation)}%</span>
                    </div>
                    <div className="mt-8 flex items-center gap-3 text-amber-500">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">{actualPresent} In Aula</span>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-[60px] group-hover:bg-amber-500/10 transition-all duration-700" />
            </div>

            {/* Vagabondi Count */}
            <div
                onClick={onOpenPending}
                className={`backdrop-blur-xl border rounded-3xl p-6 md:p-8 relative overflow-hidden group transition-all duration-500 cursor-pointer shadow-xl flex flex-col justify-between ${pendingTotal > 50 ? 'bg-red-500/5 border-red-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
            >
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-6">In Sospeso</div>
                        <span className={`text-5xl md:text-7xl font-extrabold tracking-tighter italic ${pendingTotal > 50 ? 'text-red-500' : 'text-white'}`}>{pendingTotal}</span>
                    </div>
                    <div className="mt-8 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Search className={`w-4 h-4 ${pendingTotal > 50 ? 'text-red-500' : 'text-white/40'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">Dettagli</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Sessione */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-green-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden group transition-all duration-500 shadow-xl">
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <div className="text-green-500/40 text-[10px] font-bold uppercase tracking-widest mb-6">Status Sessione</div>
                        <span className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter italic">{activitiesCount}</span>
                    </div>
                    <div className="mt-8 flex items-center gap-3 text-green-500">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">Attività Attive</span>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-[60px] group-hover:bg-green-500/10 transition-all duration-700" />
            </div>
        </div>
    );
};
