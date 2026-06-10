import React, { useMemo } from "react";
import type { Activity } from '../../../types';
import { Trophy, Users, X } from "lucide-react";

interface Props {
    activities: Activity[];
    currentTurn: string;
    onClose: () => void;
}

export const ActivityRanking: React.FC<Props> = ({ activities, currentTurn, onClose }) => {
    const ranked = useMemo(() => {
        return [...activities].map(a => {
            const count = currentTurn === 'ALL'
                ? Object.values(a.counts_by_turn || {}).reduce((sum, c) => sum + c, 0)
                : (a.counts_by_turn?.[currentTurn] || 0);
            const cap = currentTurn === 'ALL'
                ? a.max_capacity * (a.turn_ids?.length || 1)
                : a.max_capacity;
            const saturation = cap > 0 ? (count / cap) * 100 : 0;

            return { ...a, count, cap, saturation };
        }).sort((a, b) => b.saturation - a.saturation);
    }, [activities, currentTurn]);

    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                            <Trophy className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest">Classifica Attività</h2>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                Ordinate per tasso di riempimento — {currentTurn === 'ALL' ? 'Tutti i turni' : `Turno ${currentTurn}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-2">
                    {ranked.map((a, i) => (
                        <div
                            key={a.id}
                            className={`flex items-center gap-4 p-5 rounded-2xl border transition-all hover:bg-white/5 ${i < 3 ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5 bg-white/2'
                                }`}
                        >
                            <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                {i < 3 ? (
                                    <span className="text-2xl">{medals[i]}</span>
                                ) : (
                                    <span className="text-lg font-black text-white/20">#{i + 1}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-lg truncate">{a.name}</h3>
                                    <div className="flex gap-1 shrink-0">
                                        {(a.turn_ids || []).map(t => (
                                            <span key={t} className="px-1.5 py-0.5 bg-white/5 text-white/30 rounded text-[7px] font-black">T{t}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-700 rounded-full ${a.saturation >= 100 ? 'bg-red-500' : a.saturation >= 80 ? 'bg-amber-500' : 'bg-primary'
                                                }`}
                                            style={{ width: `${Math.min(100, a.saturation)}%` }}
                                        />
                                    </div>
                                    <span className={`text-sm font-black min-w-[3rem] text-right ${a.saturation >= 100 ? 'text-red-400' : a.saturation >= 80 ? 'text-amber-400' : 'text-primary'
                                        }`}>
                                        {Math.round(a.saturation)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-white/30 shrink-0">
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-bold">{a.count}/{a.cap}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
