import React, { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';
import { formatDateToISO } from '../../../utils/dateUtils';
import type { Assembly } from '../../../types';

interface GlobalTimelineProps {
    assembly: Assembly | null | undefined;
}

export const GlobalTimeline: React.FC<GlobalTimelineProps> = ({ assembly }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000); // Update every 30s
        return () => clearInterval(timer);
    }, []);

    const turn_schedules = assembly?.turn_schedules;
    if (!turn_schedules || !assembly.date || !assembly.turn_ids) return null;

    const isoDate = formatDateToISO(assembly.date);
    const sortedTurnIds = [...assembly.turn_ids].sort();
    
    const firstSched = turn_schedules[sortedTurnIds[0]];
    const lastSched = turn_schedules[sortedTurnIds[sortedTurnIds.length - 1]];
    if (!firstSched || !lastSched) return null;

    // Calculate total timeline span
    const startOfFirst = new Date(`${isoDate}T${firstSched.start}`).getTime();
    const endOfLast = new Date(`${isoDate}T${lastSched.end}`).getTime();
    const totalDuration = endOfLast - startOfFirst;

    const getProgress = (time: number) => {
        const progress = ((time - startOfFirst) / totalDuration) * 100;
        return Math.min(Math.max(0, progress), 100);
    };

    const currentProgress = getProgress(now.getTime());
    const isActive = now.getTime() >= startOfFirst && now.getTime() <= endOfLast;

    // Find next turn
    const nextTurnId = isActive 
        ? sortedTurnIds.find(tid => {
            const sched = turn_schedules[tid];
            return sched && new Date(`${isoDate}T${sched.start}`).getTime() > now.getTime();
        })
        : null;
    
    const nextTurnStart = nextTurnId ? new Date(`${isoDate}T${turn_schedules[nextTurnId]!.start}`).getTime() : null;
    const timeLeft = nextTurnStart ? Math.ceil((nextTurnStart - now.getTime()) / 60000) : null;

    return (
        <div className="bg-[#09090b]/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 space-y-8 shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-lime/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-lime/10 text-brand-lime border border-brand-lime/10">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Timeline Globale</p>
                        <h3 className="text-sm font-black italic tracking-tighter text-white uppercase">Stato Orario Assemblea</h3>
                    </div>
                </div>
                {isActive ? (
                    <div className="flex items-center gap-2">
                        {timeLeft !== null && timeLeft <= 15 && (
                            <div className="px-2.5 py-1 bg-brand-lime/10 border border-brand-lime/20 rounded-lg hidden sm:flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-brand-lime italic">Prossimo: {timeLeft}m</span>
                            </div>
                        )}
                        <div className="px-3.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-1.5 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-400">In Corso</span>
                        </div>
                    </div>
                ) : (
                    <div className="px-3.5 py-1 bg-white/5 border border-white/10 rounded-lg">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 italic">Offline</span>
                    </div>
                )}
            </div>

            <div className="relative pt-6 pb-6">
                {/* Background Rail */}
                <div className="h-2 w-full bg-white/5 rounded-full relative border border-white/5 overflow-visible">
                    {/* Current Progress Indicator */}
                    <div 
                        className="absolute h-full top-0 left-0 bg-gradient-to-r from-brand-lime/30 to-brand-lime/60 rounded-full transition-all duration-1000 origin-left"
                        style={{ width: `${currentProgress}%` }}
                    />
                    
                    {/* Current Time Pin */}
                    {isActive && (
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/pin"
                            style={{ left: `${currentProgress}%` }}
                        >
                            <div className="w-2 h-7 bg-brand-lime shadow-[0_0_15px_rgba(226,243,60,0.8)] rounded-full border border-black/20" />
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-brand-lime text-black text-[9px] font-black rounded-md opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap shadow-2xl">
                                ORA ({now.getHours()}:{now.getMinutes().toString().padStart(2, '0')})
                            </div>
                        </div>
                    )}

                    {/* Turn Markers */}
                    {sortedTurnIds.map((tid, idx) => {
                        const sched = turn_schedules[tid];
                        if (!sched) return null;
                        const start = new Date(`${isoDate}T${sched.start}`).getTime();
                        const end = new Date(`${isoDate}T${sched.end}`).getTime();
                        const startPercent = getProgress(start);
                        const endPercent = getProgress(end);
                        
                        const isCurrentTurn = now.getTime() >= start && now.getTime() <= end;

                        return (
                            <React.Fragment key={tid}>
                                {/* Turn block */}
                                <div 
                                    className={`absolute h-full top-0 transition-all border-x border-white/10 ${
                                        isCurrentTurn ? 'bg-brand-lime/10 border-x-brand-lime/30' : 'bg-white/[0.02]'
                                    }`}
                                    style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
                                >
                                    <div className="absolute -bottom-10 left-0 right-0 text-center">
                                        <p className={`text-[9px] font-black italic tracking-tighter ${isCurrentTurn ? 'text-brand-lime' : 'text-white/40'}`}>
                                            T{tid}
                                        </p>
                                        <p className="text-[7.5px] font-bold text-white/20 uppercase tracking-tighter">
                                            {sched.start}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Transition Period (if not last) */}
                                {idx < sortedTurnIds.length - 1 && (
                                    <div 
                                        className="absolute h-[2px] top-1/2 -translate-y-1/2 opacity-20"
                                        style={{ 
                                            left: `${endPercent}%`, 
                                            width: `${getProgress(new Date(`${isoDate}T${turn_schedules[sortedTurnIds[idx+1]]?.start || ''}`).getTime()) - endPercent}%` 
                                        }}
                                    >
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[7px] font-black text-white/20 uppercase whitespace-nowrap">
                                            Sposta
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
            
            <div className="pt-6 flex justify-between items-center border-t border-white/10 relative z-10">
                <div className="flex gap-6 sm:gap-8">
                    <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Inizio</p>
                        <p className="text-xs font-black italic text-white/70">{firstSched.start}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Fine Prevista</p>
                        <p className="text-xs font-black italic text-white/70">{lastSched.end}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black text-white/40 uppercase tracking-widest">
                    <Timer className="w-3.5 h-3.5 text-brand-lime" />
                    Aggiornamento Live
                </div>
            </div>
        </div>
    );
};
