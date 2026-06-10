import React from "react";
import { MapPin, Star } from "lucide-react";
import type { Activity, AppConfig } from "../../../types";

interface AdminRoomTableProps {
    activities: Activity[];
    config: AppConfig;
    onOpenAnalytics: (id: string) => void;
}

export const AdminRoomTable: React.FC<AdminRoomTableProps> = ({
    activities,
    config,
    onOpenAnalytics
}) => {

    return (
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700 transition-all">
            <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight italic">Monitoraggio Live</h2>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Status Aule & Iscrizioni</p>
                </div>
                <div className="px-5 py-2 bg-white/5 border border-white/5 rounded-full text-white/60 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                    {activities.length} Attività In Corso
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02] text-white/40 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                            <th className="px-6 md:px-8 py-6">Attività</th>
                            <th className="px-6 md:px-8 py-6">Location</th>
                            <th className="px-6 md:px-8 py-6 text-center">Protocollo PIN</th>
                            <th className="px-6 md:px-8 py-6 text-center">Score</th>
                            <th className="px-6 md:px-8 py-6 text-center">Saturation</th>
                            <th className="px-6 md:px-8 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {activities.sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(activity => (
                            <tr key={activity.id} className="hover:bg-white/[0.04] transition-all group/row">
                                <td className="px-6 md:px-8 py-6">
                                    <div className="font-extrabold text-lg tracking-tight group-hover/row:text-primary transition-colors leading-none">{activity.name}</div>
                                    <div className="flex gap-1.5 mt-3">
                                        {(activity.turn_ids || []).map(t => (
                                            <span key={t} className="px-2 py-0.5 bg-white/5 text-white/40 rounded-md text-[9px] font-bold tracking-widest border border-white/5">T{t}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 md:px-8 py-6">
                                    <div className="flex items-center gap-3 text-sm font-bold tracking-tight text-white/60 group-hover/row:text-white transition-colors">
                                        <MapPin className="w-4 h-4 text-primary/40 group-hover/row:text-primary transition-colors" />
                                        {activity.location_name || <span className="text-white/10 italic">N/D</span>}
                                    </div>
                                </td>
                                <td className="px-6 md:px-8 py-6">
                                    <div className="flex justify-center">
                                        <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary font-bold text-xs tracking-[0.2em] shadow-inner group-hover/row:bg-primary group-hover/row:text-black transition-all duration-300">
                                            {activity.access_pin}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 md:px-8 py-6">
                                    <div className="flex flex-col items-center gap-1.5">
                                        {activity.rating_stats?.count ? (
                                            <>
                                                <div className="flex items-center gap-1.5 text-brand-lime font-extrabold text-lg italic">
                                                    <Star className="w-4 h-4 fill-brand-lime" />
                                                    {activity.rating_stats.average.toFixed(1)}
                                                </div>
                                                <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                                    {activity.rating_stats.count} Feedback
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest border border-white/5 px-3 py-1 rounded-lg">N/A</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 md:px-8 py-6">
                                    {(() => {
                                        const count = config.currentTurn === 'ALL'
                                            ? Object.values(activity.counts_by_turn || {}).reduce((a, b) => a + b, 0)
                                            : (activity.counts_by_turn?.[config.currentTurn] || 0);
                                        const cap = config.currentTurn === 'ALL'
                                            ? activity.max_capacity * (activity.turn_ids?.length || 0)
                                            : activity.max_capacity;
                                        const percentage = Math.min(100, (count / (cap || 1)) * 100);

                                        return (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-lg">{count}</span>
                                                    <span className="text-white/10 text-xs font-bold">/</span>
                                                    <span className="text-white/40 font-bold">{cap}</span>
                                                </div>
                                                <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ease-out ${count >= cap ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(226,243,60,0.5)]'}`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </td>
                                <td className="px-6 md:px-8 py-6 text-right">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => onOpenAnalytics(activity.id)}
                                            className="bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest border border-white/5 transition-all active:scale-95"
                                        >
                                            Analisi
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-white/5">
                {activities.sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(activity => (
                    <div key={activity.id} className="p-6 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-extrabold text-lg leading-tight mb-2 tracking-tight">{activity.name}</div>
                                <div className="flex items-center gap-2 text-xs font-bold text-white/40 tracking-widest">
                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                    {activity.location_name}
                                </div>
                            </div>
                            <div className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary font-bold text-xs tracking-widest">
                                {activity.access_pin}
                            </div>
                        </div>

                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                            {(() => {
                                const count = config.currentTurn === 'ALL'
                                    ? Object.values(activity.counts_by_turn || {}).reduce((a, b) => a + b, 0)
                                    : (activity.counts_by_turn?.[config.currentTurn] || 0);
                                const cap = config.currentTurn === 'ALL'
                                    ? activity.max_capacity * (activity.turn_ids?.length || 0)
                                    : activity.max_capacity;

                                return (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Flow Status</span>
                                            <span className={`text-base font-bold ${count >= cap ? 'text-red-500' : 'text-primary'}`}>
                                                {count} <span className="text-white/20 text-xs mx-1">/</span> {cap}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${count >= cap ? 'bg-red-500' : 'bg-primary'}`}
                                                style={{ width: `${Math.min(100, (count / (cap || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {activity.turn_ids?.map(t => (
                                    <span key={t} className="px-2 py-1 bg-white/5 rounded-md text-[10px] font-bold text-white/40 tracking-widest border border-white/5">T{t}</span>
                                ))}
                                {activity.rating_stats && (
                                    <span className="ml-auto flex items-center gap-1 text-brand-lime font-bold text-xs">
                                        <Star className="w-3 h-3 fill-brand-lime" />
                                        {activity.rating_stats.average.toFixed(1)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => onOpenAnalytics(activity.id)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/5 active:scale-95 transition-all"
                            >
                                Analisi Protocollo
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
