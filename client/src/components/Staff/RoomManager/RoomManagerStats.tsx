import React, { useMemo } from "react";
import { X, Award, Clock, UserCheck, AlertTriangle } from "lucide-react";
import type { Student, Activity, UserProfile } from "../../../types";

interface Props {
    students: Student[];
    activities: Activity[];
    userProfiles: UserProfile[];
    onClose: () => void;
}

interface RMStats {
    email: string;
    displayName: string | null;
    totalCheckins: number;
    forcedEntries: number;
    firstCheckin: string | null;
    lastCheckin: string | null;
    activitiesManaged: Set<string>;
}

export const RoomManagerStats: React.FC<Props> = ({ students, activities, userProfiles, onClose }) => {
    const stats = useMemo(() => {
        const rmMap = new Map<string, RMStats>();

        students.forEach(s => {
            if (!s.actual_location) return;
            Object.entries(s.actual_location).forEach(([turnId, loc]: [string, any]) => {
                if (!loc?.markedBy) return;

                const email = loc.markedBy;
                if (!rmMap.has(email)) {
                    const profile = userProfiles.find(u => u.email.toLowerCase() === email.toLowerCase());
                    rmMap.set(email, {
                        email,
                        displayName: profile?.displayName || null,
                        totalCheckins: 0,
                        forcedEntries: 0,
                        firstCheckin: null,
                        lastCheckin: null,
                        activitiesManaged: new Set(),
                    });
                }

                const rm = rmMap.get(email)!;
                rm.totalCheckins++;
                if (loc.activity_id) rm.activitiesManaged.add(loc.activity_id);

                // Track timing
                if (loc.markedAt) {
                    if (!rm.firstCheckin || loc.markedAt < rm.firstCheckin) rm.firstCheckin = loc.markedAt;
                    if (!rm.lastCheckin || loc.markedAt > rm.lastCheckin) rm.lastCheckin = loc.markedAt;
                }

                // Check if forced (over capacity)
                const activity = activities.find(a => a.id === loc.activity_id);
                if (activity) {
                    const turnCount = activity.counts_by_turn?.[turnId] || 0;
                    if (turnCount > activity.max_capacity) rm.forcedEntries++;
                }
            });
        });

        return Array.from(rmMap.values()).sort((a, b) => b.totalCheckins - a.totalCheckins);
    }, [students, activities]);

    // Calculate metrics
    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl"><Award className="w-6 h-6 text-blue-400" /></div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest">Performance Staff</h2>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{stats.length} room manager attivi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {stats.length === 0 ? (
                        <div className="text-center py-20 text-white/20">
                            <Award className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-bold">Nessun check-in registrato</p>
                            <p className="text-xs mt-1">Le statistiche appariranno dopo i primi check-in</p>
                        </div>
                    ) : (
                        stats.map((rm: RMStats, i: number) => {
                            return (
                                <div
                                    key={rm.email}
                                    className={`border rounded-2xl p-6 transition-all hover:bg-white/5 ${i < 3 ? 'border-blue-500/20 bg-blue-500/5' : 'border-white/5 bg-white/2'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{i < 3 ? medals[i] : `#${i + 1}`}</span>
                                            <div>
                                                <h3 className="font-black text-lg">{rm.displayName || rm.email.split('@')[0]}</h3>
                                                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">{rm.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-primary">{rm.totalCheckins}</div>
                                            <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest">check-in</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-white/20 shrink-0" />
                                            <div>
                                                <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Impegno Stimato</div>
                                                <div className="text-sm font-bold truncate">
                                                    {(() => {
                                                        const totalSec = (rm.totalCheckins * 25) + (rm.forcedEntries * 50);
                                                        const m = Math.floor(totalSec / 60);
                                                        const s = totalSec % 60;
                                                        return m > 0 ? `${m}m ${s}s*` : `${s}s*`;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center gap-2">
                                            <UserCheck className="w-4 h-4 text-white/20 shrink-0" />
                                            <div>
                                                <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Attività</div>
                                                <div className="text-sm font-bold">{rm.activitiesManaged.size}</div>
                                            </div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center gap-2">
                                            <AlertTriangle className={`w-4 h-4 shrink-0 ${rm.forcedEntries > 0 ? 'text-amber-400' : 'text-white/20'}`} />
                                            <div>
                                                <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Forzati</div>
                                                <div className={`text-sm font-bold ${rm.forcedEntries > 0 ? 'text-amber-400' : ''}`}>{rm.forcedEntries}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[7px] text-white/10 mt-3 font-bold uppercase tracking-widest">*Stima basata sul carico di lavoro (25s / check-in + 50s / forzato)</p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
