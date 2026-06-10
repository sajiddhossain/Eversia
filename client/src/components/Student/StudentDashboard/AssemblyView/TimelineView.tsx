import React from 'react';
import { MapPin, CheckCircle, AlertTriangle, Sparkles, Star, Info } from 'lucide-react';
import type { Activity, Student } from '../../../../types';

interface TimelineViewProps {
    allTurnIds: string[];
    activities: Activity[];
    studentData: Student | null;
    turnTimestamps: Record<string, { start: number; end: number }>;
    currentTime: Date;
    onRate?: (turnId: string, activityId: string, rating: number) => void;
    onViewInfo: (activity: Activity) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({
    allTurnIds,
    activities,
    studentData,
    turnTimestamps,
    currentTime,
    onRate,
    onViewInfo
}) => {
    return (
        <div className="relative pt-6 pb-12">
            {/* Main vertical line */}
            <div className="absolute left-[24px] sm:left-[33px] top-0 bottom-0 w-[1px] bg-white/[0.05]" />

            <div className="space-y-16 relative z-10">
                {allTurnIds.map((turnId, index) => {
                    const turnClean = turnId.replace('T', '');
                    const bookedActId = studentData?.scheduled_turns?.[turnClean] || studentData?.scheduled_turns?.[`T${turnClean}`];
                    const bookedActivity = bookedActId ? activities.find(a => a.id === bookedActId) : null;
                    
                    const actual = studentData?.staff_actual_location?.[turnClean] ||
                                   studentData?.staff_actual_location?.[`T${turnClean}`] ||
                                   studentData?.actual_location?.[turnClean] ||
                                   studentData?.actual_location?.[`T${turnClean}`];
                    const hasCheckedIn = actual?.checked_in;
                    const isLast = index === allTurnIds.length - 1;

                    // Time range — only show if valid
                    const ts = turnTimestamps[turnId];
                    const isCurrentTurn = ts &&
                        !isNaN(ts.start) && !isNaN(ts.end) &&
                        currentTime.getTime() >= ts.start &&
                        currentTime.getTime() <= ts.end;

                    const timeRange = ts && !isNaN(ts.start) && !isNaN(ts.end)
                        ? `${new Date(ts.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(ts.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : null;

                    const attendedActId = actual?.activity_id;
                    const attendedActivity = attendedActId ? activities.find(a => a.id === attendedActId) : null;

                    const isStaff = attendedActId === 'STAFF';
                    const isGatecrashing = !!(hasCheckedIn && attendedActId && attendedActId !== bookedActId && !isStaff);
                    
                    const displayActivity = isStaff
                        ? { id: 'STAFF', name: 'Servizio Staff', description: 'Sei in servizio come membro dello staff dell\'assemblea.', location_name: 'Sede Assemblea', turn_ids: [] } as any
                        : (isGatecrashing ? attendedActivity : bookedActivity);

                    const locationLabel = displayActivity?.room_name || displayActivity?.location_name;

                    return (
                        <div key={turnId} className="flex gap-4 sm:gap-10 group animate-in fade-in slide-in-from-left-4 duration-700 scroll-reveal-item" style={{ animationDelay: `${index * 150}ms` }}>
                            {/* Marker container */}
                            <div className="relative flex flex-col items-center shrink-0">
                                {/* Indicator Dot (Squircle Shape) */}
                                <div className={`w-12 h-12 sm:w-[66px] sm:h-[66px] rounded-2xl sm:rounded-[1.75rem] border-[3px] sm:border-4 border-[#09090b] flex items-center justify-center transition-all duration-700 z-20 shadow-2xl overflow-hidden group-hover:scale-105 group-hover:rotate-6 bg-[#09090b] relative ${
                                    isGatecrashing
                                        ? 'text-black'
                                        : hasCheckedIn
                                            ? 'text-black'
                                            : isCurrentTurn
                                                ? 'text-black'
                                                : bookedActivity
                                                    ? 'text-white/80'
                                                    : 'text-white/20'
                                }`}>
                                    {/* Solid background mask overlays */}
                                    <div className={`absolute inset-0 ${
                                        isGatecrashing
                                            ? 'bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                                            : hasCheckedIn
                                                ? 'bg-brand-lime shadow-[0_0_30px_rgba(226,243,60,0.3)]'
                                                : isCurrentTurn
                                                    ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                                                    : bookedActivity
                                                        ? 'bg-white/10'
                                                        : 'bg-white/[0.03]'
                                    }`} />
                                    <span className="relative z-10 flex items-center justify-center">
                                        {isGatecrashing
                                            ? <AlertTriangle className="w-5 h-5 sm:w-7 sm:h-7" />
                                            : hasCheckedIn 
                                                ? <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7" /> 
                                                : isCurrentTurn 
                                                    ? <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 animate-spin-slow" />
                                                    : <span className="text-base sm:text-xl font-bold font-display italic">{index + 1}</span>
                                        }
                                    </span>
                                </div>

                                {/* Turn times below the indicator */}
                                {timeRange && (
                                    <div className="mt-4 text-center space-y-1 hidden sm:block">
                                        <div className={`text-[10px] font-semibold tabular-nums tracking-wide transition-all duration-700 ${
                                            isCurrentTurn ? 'text-brand-lime scale-105' : 'text-white/20'
                                        }`}>
                                            {new Date(ts.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="w-4 h-[1px] bg-white/10 mx-auto" />
                                        <div className={`text-[10px] font-semibold tabular-nums tracking-wide transition-all duration-700 ${
                                            isCurrentTurn ? 'text-brand-lime/60' : 'text-white/10'
                                        }`}>
                                            {new Date(ts.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                )}

                                {/* Progress line for LIVE turn */}
                                {isCurrentTurn && !isLast && (
                                    <div className="absolute top-14 sm:top-20 bottom-[-64px] w-[3px] bg-white/5 opacity-50 overflow-hidden rounded-full">
                                        <div 
                                            className="w-full bg-brand-lime shadow-[0_0_15px_rgba(226,243,60,0.8)] transition-all duration-1000"
                                            style={{
                                                height: `${(() => {
                                                    if (!ts) return 0;
                                                    const total = ts.end - ts.start;
                                                    const current = currentTime.getTime() - ts.start;
                                                    return Math.min(100, Math.max(0, (current / total) * 100));
                                                })()}%`
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Card content */}
                            <div className="flex-1 min-w-0 pt-1">
                                <div
                                    role={displayActivity ? "button" : undefined}
                                    tabIndex={displayActivity ? 0 : -1}
                                    onClick={(e) => {
                                        if (!displayActivity) return;
                                        // Ignore click if clicking button (like Info or Rating)
                                        if ((e.target as HTMLElement).closest('.rating-container') || (e.target as HTMLElement).closest('button')) {
                                            return;
                                        }
                                        onViewInfo(displayActivity);
                                    }}
                                    onKeyDown={(e) => {
                                        if (displayActivity && (e.key === 'Enter' || e.key === ' ')) {
                                            e.preventDefault();
                                            onViewInfo(displayActivity);
                                        }
                                    }}
                                    className={`rounded-2xl md:rounded-[2.5rem] border transition-all duration-500 overflow-hidden shadow-2xl ${
                                        isGatecrashing
                                            ? 'border-amber-500/30 bg-amber-500/[0.03] shadow-[0_0_50px_rgba(245,158,11,0.05)] cursor-pointer hover:bg-amber-500/[0.05] hover:border-amber-500/40'
                                            : hasCheckedIn
                                                ? 'border-brand-lime/15 bg-brand-lime/[0.02] cursor-pointer hover:border-brand-lime/25 hover:bg-brand-lime/[0.04]'
                                                : isCurrentTurn
                                                    ? 'border-white/20 bg-white/[0.04] shadow-[0_0_50px_rgba(255,255,255,0.03)] cursor-pointer hover:border-white/30 hover:bg-white/[0.06]'
                                                    : bookedActivity
                                                        ? 'border-white/[0.06] bg-white/[0.01] hover:border-white/15 cursor-pointer hover:bg-white/[0.02]'
                                                        : 'border-white/[0.03] bg-transparent opacity-40 grayscale'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div className={`px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-4 border-b transition-colors duration-500 ${
                                        isGatecrashing ? 'border-amber-500/10' : hasCheckedIn ? 'border-brand-lime/10' : isCurrentTurn ? 'border-white/10' : 'border-white/[0.04]'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-semibold tracking-wide tabular-nums ${isCurrentTurn ? 'text-brand-lime' : 'text-white/40'}`}>
                                                Turno {index + 1} {timeRange ? `• ${timeRange}` : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isGatecrashing ? (
                                                <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-2 animate-pulse">
                                                    <AlertTriangle className="w-3.5 h-3.5" /> Imprevisto
                                                </span>
                                            ) : hasCheckedIn ? (
                                                <span className="text-[10px] font-semibold text-brand-lime uppercase tracking-wider flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-lime shadow-[0_0_8px_rgba(226,243,60,0.8)]" /> Verificato
                                                </span>
                                            ) : isCurrentTurn && !hasCheckedIn && (
                                                <span className="text-[10px] font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white live-beacon shadow-[0_0_8px_rgba(255,255,255,0.5)]" /> Live ora
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-6">
                                        {displayActivity ? (
                                            <div className="space-y-4">
                                                <div>
                                                     <div className="flex items-start justify-between gap-4">
                                                         <div className="space-y-1">
                                                             <h3 className="text-base sm:text-lg font-semibold font-display text-white leading-snug tracking-tight flex items-center gap-2 flex-wrap">
                                                                 {displayActivity.name}
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => onViewInfo(displayActivity)}
                                                                     className="p-1 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-brand-lime hover:bg-brand-lime/10 hover:border-brand-lime/20 transition-all cursor-pointer"
                                                                     title="Dettagli attività"
                                                                 >
                                                                     <Info className="w-3.5 h-3.5" />
                                                                 </button>
                                                             </h3>
                                                         </div>
                                                         {isGatecrashing && bookedActivity && (
                                                             <span className="text-[10px] font-semibold text-white/20 line-through shrink-0 mt-1">
                                                                 Era: {bookedActivity.name}
                                                             </span>
                                                         )}
                                                     </div>
                                                </div>
                                                {locationLabel && (
                                                    <div className="flex items-center gap-2 pt-4 border-t border-white/[0.02]">
                                                        <div className={`p-1.5 rounded-lg ${
                                                            isGatecrashing ? 'bg-amber-500/10 text-amber-500' :
                                                            isCurrentTurn ? 'bg-primary/10 text-primary' : 
                                                            'bg-white/5 text-white/40'
                                                        }`}>
                                                            <MapPin className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${isGatecrashing ? 'text-amber-500/80' : 'text-white/60'}`}>
                                                            {locationLabel}
                                                            {(displayActivity?.location_floor || displayActivity?.location_number) && ` (${[
                                                                displayActivity.location_floor && `Piano ${displayActivity.location_floor}`,
                                                                displayActivity.location_number && `Aula ${displayActivity.location_number}`
                                                            ].filter(Boolean).join(' • ')})`}
                                                        </span>
                                                        {isGatecrashing && (
                                                            <span className="text-[9px] font-semibold text-amber-500/40 ml-auto">
                                                                 Aula non prevista
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Star Rating UI */}
                                                {hasCheckedIn && ts && currentTime.getTime() > ts.end && displayActivity && displayActivity.id !== 'STAFF' && (
                                                    <div className="pt-4 border-t border-white/[0.05] rating-container">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                                                                {studentData?.actual_location?.[turnId]?.rating 
                                                                    ? 'Valutazione inviata' 
                                                                    : 'Come è stata questa attività?'
                                                                }
                                                            </span>
                                                            <div className="flex gap-2">
                                                                {[1, 2, 3, 4, 5].map((star) => {
                                                                    const currentRating = studentData?.actual_location?.[turnId]?.rating;
                                                                    const isSelected = !!(currentRating && star <= currentRating);
                                                                    const isActive = !currentRating;

                                                                    return (
                                                                        <button
                                                                            key={star}
                                                                            disabled={!isActive}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onRate?.(turnId, displayActivity.id, star);
                                                                            }}
                                                                            className={`group/star relative p-1 transition-all duration-300 btn-press ${
                                                                                isActive ? 'hover:scale-125' : ''
                                                                            }`}
                                                                        >
                                                                            <Star 
                                                                                className={`w-6 h-6 transition-all duration-300 ${
                                                                                    isSelected 
                                                                                        ? 'fill-brand-lime text-brand-lime animate-star-select' 
                                                                                        : 'text-white/10 group-hover/star:text-brand-lime/50'
                                                                                } ${isActive ? 'cursor-pointer' : 'cursor-default'}`} 
                                                                            />
                                                                            {isActive && (
                                                                                <div className="absolute inset-0 bg-brand-lime/20 blur-lg rounded-full opacity-0 group-hover/star:opacity-100 transition-opacity" />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 py-2 text-white/10 group-hover:text-white/20 transition-colors">
                                                <AlertTriangle className="w-5 h-5" />
                                                <p className="text-xs font-semibold uppercase tracking-wider">Nessuna attività</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineView;
