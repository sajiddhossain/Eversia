import React from "react";
import { Bar } from "react-chartjs-2";
import { Star, Users } from "lucide-react";
import type { Activity, AppConfig } from "../../../types";

interface AdminVisualsProps {
    chartContainerRef: React.RefObject<HTMLDivElement | null>;
    chartData: any;
    chartOptions: any;
    activities: Activity[];
    config: AppConfig;
    pendingTotal: number;
    totalStudents: number;
    studentsMissingAssignment: number;
    studentsInCurrentTurn: any[];
}

export const AdminVisuals: React.FC<AdminVisualsProps> = ({
    chartContainerRef,
    chartData,
    chartOptions,
    activities,
    config,
    pendingTotal,
    totalStudents,
    studentsMissingAssignment,
    studentsInCurrentTurn
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            {/* Chart */}
            <div ref={chartContainerRef} className="lg:col-span-2 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden group transition-all duration-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[100px] pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight italic">Carico Attività</h2>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Saturazione Real-time</p>
                    </div>
                    <div className="flex gap-6 bg-black/20 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(226,243,60,0.4)]" />
                            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Occupati</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 bg-white/10 rounded-full" />
                            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Liberi</span>
                        </div>
                    </div>
                </div>
                <div className="h-[350px] md:h-[450px] relative z-10">
                    <Bar data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Insights / Stats */}
            <div className="space-y-8 flex flex-col h-full">
                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 flex-col shadow-xl relative overflow-hidden group transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                    
                    <h2 className="text-xl font-extrabold tracking-tight mb-8 border-b border-primary/20 pb-5 italic">Insight Rapidi</h2>
                    <div className="space-y-8 relative z-10">
                        <div className="group/stat">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 group-hover/stat:text-primary transition-colors">Più Congestionata</p>
                            <div className="text-lg font-black uppercase tracking-tight truncate group-hover/stat:translate-x-1 transition-transform">
                                {activities.length > 0 ? [...activities].sort((a, b) => {
                                    const countA = config.currentTurn === 'ALL' ? Object.values(a.counts_by_turn || {}).reduce((sum, c) => sum + c, 0) : (a.counts_by_turn?.[config.currentTurn] || 0);
                                    const countB = config.currentTurn === 'ALL' ? Object.values(b.counts_by_turn || {}).reduce((sum, c) => sum + c, 0) : (b.counts_by_turn?.[config.currentTurn] || 0);
                                    return countB - countA;
                                })[0]?.name || "N/D" : "N/D"}
                            </div>
                        </div>
                        <div className="group/stat">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 group-hover/stat:text-brand-lime transition-colors">Apprezzamento MAX</p>
                            <div className="text-lg font-black uppercase tracking-tight truncate flex items-center gap-3 group-hover/stat:translate-x-1 transition-transform">
                                {activities.length > 0 ? (() => {
                                    const ratedActivities = activities.filter(a => (a.rating_stats?.count || 0) > 0);
                                    if (ratedActivities.length === 0) return "N/D";
                                    const best = [...ratedActivities].sort((a, b) => (b.rating_stats?.average || 0) - (a.rating_stats?.average || 0))[0];
                                    if (!best) return "N/D";
                                    return (
                                        <>
                                            {best.name}
                                            <span className="text-brand-lime text-xs flex items-center gap-1.5 px-2 py-1 bg-brand-lime/10 rounded-lg">
                                                <Star className="w-3 h-3 fill-brand-lime" />
                                                {best.rating_stats?.average.toFixed(1)}
                                            </span>
                                        </>
                                    );
                                })() : "N/D"}
                            </div>
                        </div>
                        <div className="group/stat">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 group-hover/stat:text-amber-500 transition-colors">Posti Disponibili</p>
                            <div className="text-lg font-black uppercase tracking-tight truncate group-hover/stat:translate-x-1 transition-transform">
                                {activities.length > 0 ? [...activities].sort((a, b) => {
                                    const availableA = config.currentTurn === 'ALL'
                                        ? (a.max_capacity * (a.turn_ids?.length || 0)) - Object.values(a.counts_by_turn || {}).reduce((sum, c) => sum + c, 0)
                                        : a.max_capacity - (a.counts_by_turn?.[config.currentTurn] || 0);
                                    const availableB = config.currentTurn === 'ALL'
                                        ? (b.max_capacity * (b.turn_ids?.length || 0)) - Object.values(b.counts_by_turn || {}).reduce((sum, c) => sum + c, 0)
                                        : b.max_capacity - (b.counts_by_turn?.[config.currentTurn] || 0);
                                    return availableB - availableA;
                                })[0]?.name || "N/D" : "N/D"}
                            </div>
                        </div>
                        <div className="pt-8 border-t border-white/5 mt-6">
                            <div className="p-6 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md relative min-h-[100px] flex flex-col justify-center">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 italic">Alert AI</p>
                                <p className="text-white/60 text-xs font-bold leading-relaxed uppercase tracking-wider h-auto break-words whitespace-normal">
                                    {pendingTotal > 50 ? "Importante numero di studenti in sospeso. Verificare chi non è ancora iscritto o chi risulta assente." : "Andamento partecipazione stabile. Bilanciamento attività ottimale."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Student Stats */}
                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 flex-1 shadow-xl relative overflow-hidden group transition-all duration-500">
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mb-16 blur-3xl pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-8 border-b border-primary/20 pb-5">
                        <h2 className="text-xl font-extrabold tracking-tight italic">Anagrafica</h2>
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-md group/box hover:bg-white/10 transition-colors">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 group-hover/box:text-white/60">Totale</div>
                                <div className="text-3xl font-extrabold italic">{totalStudents}</div>
                            </div>
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-md group/box hover:bg-white/10 transition-colors">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 group-hover/box:text-white/60">Missing</div>
                                <div className={`text-3xl font-extrabold italic ${studentsMissingAssignment > 0 ? 'text-amber-500' : 'text-white/20'}`}>
                                    {studentsMissingAssignment}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-md">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4 text-center">
                                {config.currentTurn === 'ALL' ? 'Saturation Index' : `Turn T${config.currentTurn} Flow`}
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-1000 shadow-[0_0_15px_rgba(226,243,60,0.5)]"
                                        style={{ width: `${totalStudents > 0 ? (studentsInCurrentTurn.length / totalStudents) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="text-xs font-black italic">{totalStudents > 0 ? Math.round((studentsInCurrentTurn.length / totalStudents) * 100) : 0}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
