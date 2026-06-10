import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Lock, CheckCheck } from 'lucide-react';
import type { Assembly, Activity, Student } from '../../../../types';

interface SummaryCardProps {
    isGuest: boolean;
    allTurnIds: string[];
    bookedCount: number;
    studentData: Student | null;
    activities: Activity[];
    formatTurn: (t: string) => string;
    selectedAssembly: Assembly;
    canBook: boolean;
    isInProgress: boolean;
    isArchived: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
    isGuest,
    allTurnIds,
    bookedCount,
    studentData,
    activities,
    formatTurn,
    selectedAssembly,
    canBook,
    isInProgress,
    isArchived
}) => {
    const totalTurns = allTurnIds.length;
    const progressPercent = totalTurns > 0 ? (bookedCount / totalTurns) * 100 : 0;
    const allDone = bookedCount === totalTurns && totalTurns > 0;

    return (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden group hover:border-brand-lime/20 transition-all duration-500 shadow-2xl">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-lime/5 blur-3xl rounded-full transition-opacity group-hover:opacity-100 opacity-50" />

            {/* Top row: title + badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl sm:text-3xl font-bold font-display italic text-white tracking-tight">
                        {isGuest ? 'Catalogo attività' : 'La tua agenda'}
                    </h2>
                    {studentData?.is_finalized && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
                            <CheckCheck className="w-3.5 h-3.5" /> Confermata
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {selectedAssembly.date && (
                        <span className="flex items-center gap-1.5 text-xs text-white/40 font-semibold bg-white/5 px-3 py-1 rounded-full border border-white/5 tabular-nums">
                            <Calendar className="w-3.5 h-3.5" />
                            {selectedAssembly.date}
                        </span>
                    )}
                    {canBook && (
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            Aperte
                        </span>
                    )}
                    {isInProgress && (
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                            In corso
                        </span>
                    )}
                    {isArchived && (
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                            <Lock className="w-3 h-3" />
                            Archivio
                        </span>
                    )}
                </div>
            </div>

            {/* Stepper dots */}
            {!isGuest && totalTurns > 0 && (
                <div className="flex items-center gap-1.5 mb-6 relative z-10">
                    {allTurnIds.map((tid, i) => {
                        const isBooked = !!studentData?.scheduled_turns?.[tid];
                        const bookedAct = isBooked
                            ? activities.find(a => a.id === studentData?.scheduled_turns?.[tid])
                            : null;

                        return (
                            <div key={tid} className="flex items-center flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0" title={isBooked && bookedAct ? bookedAct.name : formatTurn(tid)}>
                                    <div className={`w-2.5 h-2.5 rounded-md rotate-6 transition-all duration-500 ${
                                        isBooked ? 'bg-brand-lime scale-110 shadow-[0_0_12px_rgba(226,243,60,0.6)]' : 'bg-white/10'
                                    }`} />
                                    <span className={`text-xs font-semibold truncate hidden sm:block ${
                                        isBooked ? 'text-white/60' : 'text-white/20'
                                    }`}>
                                        {isBooked && bookedAct ? bookedAct.name : formatTurn(tid)}
                                    </span>
                                </div>
                                {i < allTurnIds.length - 1 && (
                                    <div className={`h-[1px] flex-1 mx-2 min-w-[8px] transition-colors duration-500 ${
                                        isBooked ? 'bg-brand-lime/20' : 'bg-white/[0.04]'
                                    }`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Progress bar */}
            {!isGuest && totalTurns > 0 && (
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-6 relative z-10 p-[1px] border border-white/[0.05]">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(226,243,60,0.3)] ${
                            allDone
                                ? 'bg-gradient-to-r from-brand-lime to-emerald-400'
                                : 'bg-gradient-to-r from-brand-lime/60 to-brand-lime'
                        }`}
                    />
                </div>
            )}

            {/* Status text */}
            <p className="text-xs text-white/30 font-semibold tracking-wide mt-6 relative z-10">
                {isGuest
                    ? `${totalTurns} turni disponibili • Sfoglia le attività`
                    : allDone
                        ? '🎉 Tutti i turni prenotati! Conferma ora.'
                        : bookedCount === 0
                            ? 'Seleziona un\'attività per iniziare.'
                            : `${bookedCount} di ${totalTurns} turni completati`
                }
            </p>
        </div>
    );
};

export default SummaryCard;
