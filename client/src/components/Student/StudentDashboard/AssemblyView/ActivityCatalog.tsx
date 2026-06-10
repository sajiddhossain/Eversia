import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle, RotateCcw, Loader2, ChevronRight, Info, Lock } from 'lucide-react';
import type { Activity, Student } from '../../../../types';

interface ActivityCatalogProps {
    allTurnIds: string[];
    activities: Activity[];
    studentData: Student | null;
    turnTimestamps: Record<string, { start: number; end: number }>;
    canBook: boolean;
    isArchived: boolean;
    bookingInProgress: string | null;
    handleSwap: (targetActivityId: string, turnId: string) => Promise<void>;
    handleBook: (activityId: string, turnId: string) => Promise<void>;
    onViewInfo: (activity: Activity) => void;
}

const ActivityCatalog: React.FC<ActivityCatalogProps> = ({
    allTurnIds,
    activities,
    studentData,
    turnTimestamps,
    canBook,
    isArchived,
    bookingInProgress,
    handleSwap,
    handleBook,
    onViewInfo
}) => {
    const [hideFull, setHideFull] = useState(false);

    return (
        <div className="space-y-6">
            {studentData?.is_finalized && (
                <div className="flex items-center gap-4 p-5 bg-brand-lime/[0.03] border border-brand-lime/10 rounded-3xl md:rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 flex items-center justify-center border border-brand-lime/20 shadow-inner shrink-0">
                        <Lock className="w-6 h-6 text-brand-lime animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-brand-lime uppercase tracking-wider italic">Prenotazione confermata</h4>
                        <p className="text-[11px] text-white/40 font-medium mt-1 leading-relaxed">
                            Le tue scelte sono state finalizzate e sono ora bloccate. Per sbloccarle e modificarle, clicca sul pulsante "Sblocca Agenda" in fondo alla pagina.
                        </p>
                    </div>
                </div>
            )}
            {/* Catalog filter controls */}
            <div className="flex justify-end pr-1">
                <button
                    onClick={() => setHideFull(!hideFull)}
                    className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-all duration-300 btn-press cursor-pointer ${
                        hideFull
                            ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime shadow-[0_0_15px_rgba(226,243,60,0.1)]'
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                    }`}
                >
                    <span className={`w-2 h-2 rounded-full ${hideFull ? 'bg-brand-lime animate-pulse shadow-[0_0_8px_rgba(226,243,60,0.8)]' : 'bg-white/20'}`} />
                    Nascondi attività piene
                </button>
            </div>
            {/* Turn sections */}
            {allTurnIds.map((turnId, turnIndex) => {
                const turnActivities = activities.filter(a => a.turn_ids?.includes(turnId));
                const bookedActId = studentData?.scheduled_turns?.[turnId];
                const isCompleted = !!bookedActId;
                const isSingleActivity = turnActivities.length === 1;

                const visibleActivities = turnActivities.filter(activity => {
                    if (hideFull) {
                        const currentCount = activity.counts_by_turn?.[turnId] || 0;
                        const isFull = currentCount >= activity.max_capacity;
                        const isSelected = bookedActId === activity.id;
                        return !isFull || isSelected;
                    }
                    return true;
                });

                const ts = turnTimestamps[turnId];
                const timeRange = ts && !isNaN(ts.start) && !isNaN(ts.end)
                    ? `${new Date(ts.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(ts.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : null;

                return (
                    <section
                        key={turnId}
                        id={`turn-section-${turnId}`}
                        className="animate-in fade-in slide-in-from-bottom-4 duration-700 scroll-reveal-item scroll-mt-24"
                        style={{ animationDelay: `${turnIndex * 150}ms` }}
                    >
                        <div className={`rounded-3xl md:rounded-[2.5rem] border overflow-hidden transition-all duration-500 shadow-2xl ${
                            isCompleted
                                ? 'border-brand-lime/20 bg-brand-lime/[0.02]'
                                : 'border-white/[0.08] bg-white/[0.02] backdrop-blur-3xl'
                        }`}>
                            {/* Section header */}
                            <div className={`px-5 md:px-8 py-4 md:py-5 flex items-center justify-between gap-4 border-b transition-all ${
                                isCompleted
                                    ? 'border-brand-lime/10 bg-brand-lime/[0.05]'
                                    : 'border-white/[0.05] bg-white/[0.03]'
                            }`}>
                                <div className="flex items-center gap-5 min-w-0">
                                    {/* Step indicator */}
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-500 shadow-2xl border ${
                                        isCompleted
                                            ? 'bg-brand-lime text-black border-brand-lime shadow-[0_0_20px_rgba(226,243,60,0.3)] scale-105 rotate-6'
                                            : 'bg-white/5 text-white/30 border-white/10'
                                    }`}>
                                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : `${turnId}°`}
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <h2 className="text-xl md:text-2xl font-bold font-display italic text-white leading-none tracking-tight">
                                            {turnId}° turno
                                        </h2>
                                        {timeRange && (
                                            <p className="text-[10px] text-white/30 font-semibold tracking-wider uppercase tabular-nums">{timeRange}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {isCompleted ? (
                                        <span className="text-[10px] font-semibold text-brand-lime tracking-wide italic drop-shadow-[0_0_10px_rgba(226,243,60,0.3)]">
                                            Scelto
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-semibold text-white/20 tracking-wide">
                                            {turnActivities.length} {turnActivities.length === 1 ? 'attività' : 'attività'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Activities list */}
                            <div className="p-4 space-y-3">
                                {turnActivities.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <p className="text-xs text-white/25 font-semibold uppercase tracking-wider">Nessuna attività</p>
                                    </div>
                                ) : visibleActivities.length === 0 ? (
                                    <div className="py-8 text-center bg-white/[0.01] border border-white/5 rounded-xl">
                                        <p className="text-xs text-white/30 font-semibold tracking-wide">Tutte le attività in questo turno sono piene</p>
                                    </div>
                                ) : null}

                                {/* Single activity notice */}
                                {isSingleActivity && !isCompleted && canBook && (
                                    <div className="flex items-center gap-3 px-6 py-4 bg-brand-lime/[0.05] border border-brand-lime/20 rounded-2xl mb-2 backdrop-blur-xl">
                                        <Info className="w-5 h-5 text-brand-lime shrink-0" />
                                        <p className="text-xs text-brand-lime/85 font-medium tracking-tight">
                                            Attività obbligatoria — selezionala per procedere.
                                        </p>
                                    </div>
                                )}

                                {visibleActivities.map(activity => {
                                    const isSelected = bookedActId === activity.id;
                                    const currentCount = activity.counts_by_turn?.[turnId] || 0;
                                    const isFull = currentCount >= activity.max_capacity;
                                    const fillPercent = Math.min(100, (currentCount / activity.max_capacity) * 100);
                                    const isOtherBookedInTurn = !!bookedActId && !isSelected;
                                    const isLoading = bookingInProgress === `${activity.id}_${turnId}`;
                                    const isDisabled = (isFull && !isSelected) || !!bookingInProgress || isArchived || (!canBook && !isSelected) || !!studentData?.is_finalized;

                                    return (
                                        <motion.div
                                            key={activity.id}
                                            role="button"
                                            tabIndex={isDisabled ? -1 : 0}
                                            whileHover={isDisabled ? undefined : { scale: 1.005 }}
                                            whileTap={isDisabled ? undefined : { scale: 0.995 }}
                                            onClick={(e) => {
                                                if (isDisabled) return;
                                                if ((e.target as HTMLElement).closest('.info-trigger-btn')) {
                                                    return;
                                                }
                                                if (isSelected || !canBook) return;
                                                if (isOtherBookedInTurn) {
                                                    handleSwap(activity.id, turnId);
                                                } else {
                                                    handleBook(activity.id, turnId);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (isDisabled) return;
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    if (isSelected || !canBook) return;
                                                    if (isOtherBookedInTurn) {
                                                        handleSwap(activity.id, turnId);
                                                    } else {
                                                        handleBook(activity.id, turnId);
                                                    }
                                                }
                                            }}
                                            className={`w-full text-left rounded-2xl md:rounded-[1.75rem] p-4 md:p-5 flex items-center gap-3 md:gap-6 transition-all duration-500 group relative border shadow-lg btn-press ${
                                                isSelected
                                                    ? 'bg-brand-lime/[0.06] border-brand-lime/40 shadow-[0_0_40px_rgba(226,243,60,0.06)] scale-[1.01] z-10'
                                                    : isFull
                                                        ? 'bg-black/40 border-white/[0.02] opacity-35 cursor-not-allowed grayscale'
                                                        : (canBook && !studentData?.is_finalized)
                                                            ? 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-brand-lime/20 cursor-pointer'
                                                            : 'bg-white/[0.01] border-white/[0.06] cursor-default'
                                            }`}>
                                            {/* Squircle Radio selector */}
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-300 rotate-6 ${
                                                isSelected
                                                    ? 'border-brand-lime bg-brand-lime shadow-[0_0_15px_rgba(226,243,60,0.4)]'
                                                    : isFull
                                                        ? 'border-white/5 bg-white/5'
                                                        : 'border-white/10 group-hover:border-brand-lime/40 bg-white/5 group-hover:bg-brand-lime/5'
                                            }`}>
                                                {isSelected && (
                                                    <div className="w-2 h-2 rounded-sm bg-black rotate-45" />
                                                )}
                                            </div>

                                            {/* Right Content Area */}
                                            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                {/* Activity info */}
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <h3 className={`text-base font-semibold transition-colors flex items-center gap-2 flex-wrap ${
                                                        isSelected ? 'text-white' : isFull ? 'text-white/20' : 'text-white/80 group-hover:text-brand-lime'
                                                    }`}>
                                                        {activity.name}
                                                        {isFull && <Lock className="w-3.5 h-3.5 opacity-40" />}
                                                        {fillPercent > 85 && !isFull && <span className="text-[8px] font-semibold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">In esaurimento</span>}
                                                    </h3>
                                                    <div className="flex items-center gap-3 pt-1">
                                                        <span className="flex items-center gap-1.5 text-[10px] text-white/20 font-semibold shrink-0">
                                                            <MapPin className="w-3 h-3 text-brand-lime/40" />
                                                            {activity.room_name || activity.location_name}
                                                            {(activity.location_floor || activity.location_number) && ` (${[
                                                                activity.location_floor && `Piano ${activity.location_floor}`,
                                                                activity.location_number && `Aula ${activity.location_number}`
                                                            ].filter(Boolean).join(' • ')})`}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-white/10 shrink-0" />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onViewInfo(activity);
                                                            }}
                                                            className="info-trigger-btn flex items-center gap-1.5 text-[10px] text-white/30 hover:text-brand-lime font-semibold transition-colors cursor-pointer"
                                                            title="Dettagli attività"
                                                        >
                                                            <Info className="w-3.5 h-3.5" />
                                                            Dettagli
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Capacity & Action Row/Stack */}
                                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t border-white/[0.04] md:border-none shrink-0">
                                                    {/* Capacity & progress bar */}
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[11px] font-semibold tabular-nums ${
                                                            isFull ? 'text-red-500/50' : fillPercent > 80 ? 'text-amber-500/80' : 'text-white/30'
                                                        }`}>
                                                            {currentCount} / {activity.max_capacity}
                                                        </span>
                                                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5 hidden xs:block">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${
                                                                    isFull ? 'bg-red-500/40' : fillPercent > 80 ? 'bg-amber-500/60' : 'bg-brand-lime/40 group-hover:bg-brand-lime'
                                                                }`}
                                                                style={{ width: `${fillPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Action hint */}
                                                    <div>
                                                        {studentData?.is_finalized ? (
                                                            isSelected ? (
                                                                <span className="text-[10px] font-semibold text-brand-lime flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(226,243,60,0.3)]">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Confermato
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-white/20 flex items-center gap-1.5">
                                                                    <Lock className="w-3.5 h-3.5" /> Bloccato
                                                                </span>
                                                            )
                                                        ) : isSelected ? (
                                                            <span className="text-[10px] font-semibold text-brand-lime flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(226,243,60,0.3)]">
                                                                <CheckCircle className="w-3.5 h-3.5" /> Scelto
                                                            </span>
                                                        ) : isFull ? (
                                                            <span className="text-[10px] font-semibold text-red-500/40 italic">Pieno</span>
                                                        ) : isOtherBookedInTurn && canBook ? (
                                                            <span className="text-[10px] font-semibold text-white/20 flex items-center gap-1.5 group-hover:text-brand-lime transition-all">
                                                                <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" /> Cambia
                                                            </span>
                                                        ) : canBook ? (
                                                            <span className="text-[10px] font-semibold text-white/20 group-hover:text-brand-lime transition-all flex items-center gap-1.5">
                                                                Scegli <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Loading overlay */}
                                            {isLoading && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-2xl md:rounded-[1.75rem] flex items-center justify-center z-20 border border-brand-lime/30 overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-lime/10 to-transparent" />
                                                    <Loader2 className="w-6 h-6 text-brand-lime animate-spin relative z-10" />
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

export default ActivityCatalog;
