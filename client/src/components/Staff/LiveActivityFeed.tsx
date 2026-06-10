import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import type { EventLogEntry } from '../../types';
import { eventTypeLabel } from "../../utils/auditLogger";
import { X, Radio, UserCheck, UserMinus, ArrowRightLeft, AlertTriangle, Shield } from "lucide-react";

interface Props {
    assemblyId: string;
    onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
    CHECK_IN: <UserCheck className="w-4 h-4 text-green-400" />,
    CHECK_OUT: <UserMinus className="w-4 h-4 text-red-400" />,
    TRANSFER: <ArrowRightLeft className="w-4 h-4 text-blue-400" />,
    GATECRASHER_DETECTED: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    FORCED_ENTRY: <Shield className="w-4 h-4 text-orange-400" />,
};

const colorMap: Record<string, string> = {
    CHECK_IN: "border-green-500/20 bg-green-500/5",
    CHECK_OUT: "border-red-500/20 bg-red-500/5",
    TRANSFER: "border-blue-500/20 bg-blue-500/5",
    GATECRASHER_DETECTED: "border-amber-500/20 bg-amber-500/5",
    FORCED_ENTRY: "border-orange-500/20 bg-orange-500/5",
};

export const LiveActivityFeed: React.FC<Props> = ({ assemblyId, onClose }) => {
    const [events, setEvents] = useState<EventLogEntry[]>([]);
    const [filter, setFilter] = useState<string>("ALL");

    useEffect(() => {
        const q = query(
            collection(db, "event_log"),
            where("assemblyId", "==", assemblyId),
            orderBy("timestamp", "desc"),
            limit(100)
        );
        const unsub = onSnapshot(q, (snap) => {
            setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as EventLogEntry)));
        });
        return () => unsub();
    }, [assemblyId]);

    const filtered = filter === "ALL" ? events : events.filter(e => e.type === filter);

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-surface border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-500 shadow-2xl cursor-default"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-xl">
                            <Radio className="w-5 h-5 text-green-500 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-widest">Feed Live</h2>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{events.length} eventi</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white transition-colors">Chiudi</span>
                        <X className="w-6 h-6 text-white/40" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-1 p-3 border-b border-white/5 bg-black/20 overflow-x-auto no-scrollbar">
                    {["ALL", "CHECK_IN", "CHECK_OUT", "TRANSFER", "GATECRASHER_DETECTED", "FORCED_ENTRY"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filter === f ? 'bg-primary text-black' : 'text-white/30 hover:text-white/50 hover:bg-white/5'}`}
                        >
                            {f === "ALL" ? "Tutti" : eventTypeLabel(f as any)}
                        </button>
                    ))}
                </div>

                {/* Events List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filtered.length === 0 && (
                        <div className="text-center py-20 text-white/20">
                            <Radio className="w-10 h-10 mx-auto mb-4 opacity-30" />
                            <p className="font-bold text-sm">Nessun evento registrato</p>
                            <p className="text-xs mt-1">Gli eventi appariranno qui in tempo reale</p>
                        </div>
                    )}
                    {filtered.map((event) => (
                        <div
                            key={event.id}
                            className={`border rounded-2xl p-4 transition-all hover:bg-white/5 ${colorMap[event.type] || 'border-white/5'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">{iconMap[event.type]}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-black text-sm">{event.studentName}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-white/30">T{event.turnId}</span>
                                    </div>
                                    <p className="text-xs text-white/50">
                                        {eventTypeLabel(event.type)} → <span className="text-white/70 font-bold">{event.activityName}</span>
                                        {event.previousActivity && (
                                            <span className="text-white/30"> (da {event.previousActivity})</span>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-[9px] text-white/20 font-bold uppercase tracking-widest">
                                        <span>{formatTime(event.timestamp)}</span>
                                        <span>•</span>
                                        <span>{event.markedBy?.split('@')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
