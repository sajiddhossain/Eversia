import React from 'react';
import { CheckCircle2, History, ChevronDown, Info, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateToIT } from '../../../utils/dateUtils';

interface ActivityEntry {
    assemblyId: string;
    assemblyName: string;
    assemblyDate?: string;
    isActive: boolean;
    activityName?: string;
    email?: string;
    scheduled_turns?: Record<string, string | null>;
    resolved_activities?: Record<string, string | null>;
    actual_location?: Record<string, any>;
    staff_actual_location?: Record<string, any>;
}

interface ActivityTimelineProps {
    enrollments: ActivityEntry[];
}

const countCompletedTurns = (entry: ActivityEntry): number => {
    const checkedTurnsSet = new Set<string>();

    if (entry.actual_location) {
        Object.entries(entry.actual_location).forEach(([k, v]) => {
            if (v && v.checked_in) {
                checkedTurnsSet.add(k.replace('T', ''));
            }
        });
    }

    if (entry.staff_actual_location) {
        Object.entries(entry.staff_actual_location).forEach(([k, v]) => {
            if (v && v.checked_in) {
                checkedTurnsSet.add(k.replace('T', ''));
            }
        });
    }

    return checkedTurnsSet.size;
};

const beautifyId = (id: string): string => {
    const parts = id.split('_');
    if (parts.length < 3) return id;
    
    const turnIndex = parts.findIndex(p => /^T\d+$/.test(p));
    if (turnIndex === -1) return id;
    
    const slug = parts.slice(turnIndex + 1, parts.length - 1).join(' ');
    if (!slug) return id;
    
    return slug
        .replace(/-/g, ' ')
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ enrollments }) => {
    const active = enrollments.filter(e => e.isActive);
    const pastParticipated = enrollments.filter(e => !e.isActive && countCompletedTurns(e) > 0);
    const pastOnlyEnrolled = enrollments.filter(e => !e.isActive && countCompletedTurns(e) === 0);

    if (enrollments.length === 0) {
        return (
            <div className="bg-white/[0.01] border border-white/5 border-dashed rounded-[2.5rem] p-12 md:p-20 text-center space-y-6">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto ring-8 ring-white/[0.02]">
                    <History className="w-10 h-10 text-white/5" />
                </div>
                <div className="space-y-2">
                    <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">Diario Vuoto</p>
                    <p className="text-xs text-white/10 max-w-[240px] mx-auto leading-relaxed">Le tue future partecipazioni appariranno qui in ordine cronologico.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative space-y-12 md:space-y-16">
            {/* Timeline backbone line - Adaptive positioning */}
            <div className="absolute left-[22px] top-6 bottom-6 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

            {/* In Corso */}
            {active.length > 0 && (
                <div className="space-y-6 md:space-y-8 relative">
                    <div className="flex items-center gap-4 relative z-10 select-none">
                        <div className="w-11 h-11 rounded-2xl bg-[#09090b] border border-emerald-500/20 flex items-center justify-center relative shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                            <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20 relative z-10" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-semibold font-display text-emerald-400">Assemblee attive</h4>
                            <p className="text-[10px] font-bold text-white/20 font-display tracking-wide uppercase">{active.length} EVENTI LIVE</p>
                        </div>
                    </div>
                    <div className="space-y-4 pl-10 md:pl-16">
                        {active.map((env, i) => (
                            <ActivityCard key={`a-${i}`} env={env} isAutoExpanded={true} />
                        ))}
                    </div>
                </div>
            )}

            {/* Partecipazioni Effettive */}
            {pastParticipated.length > 0 && (
                <div className="space-y-6 md:space-y-8 relative">
                    <div className="flex items-center gap-4 relative z-10 select-none">
                        <div className="w-11 h-11 rounded-2xl bg-[#09090b] border border-primary/20 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-primary/10 rounded-2xl" />
                            <History className="w-5 h-5 text-primary relative z-10" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-semibold font-display text-white/60">Cronologia partecipazioni</h4>
                            <p className="text-[10px] font-bold text-white/25 font-display tracking-wide uppercase">{pastParticipated.length} ASSEMBLEE COMPLETATE</p>
                        </div>
                    </div>
                    <div className="space-y-4 pl-10 md:pl-16">
                        {pastParticipated.map((env, i) => (
                            <ActivityCard key={`p-${i}`} env={env} isAutoExpanded={false} variant="PARTICIPATED" />
                        ))}
                    </div>
                </div>
            )}

            {/* Iscrizioni Non Completate */}
            {pastOnlyEnrolled.length > 0 && (
                <div className="space-y-6 md:space-y-8 relative opacity-50 grayscale-[0.3] hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-4 relative z-10 select-none">
                        <div className="w-11 h-11 rounded-2xl bg-[#09090b] border border-white/10 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-white/5 rounded-2xl" />
                            <Info className="w-5 h-5 text-white/20 relative z-10" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-semibold font-display text-white/40">Solo iscrizione</h4>
                            <p className="text-[10px] font-bold text-white/15 font-display tracking-wide uppercase">{pastOnlyEnrolled.length} EVENTI</p>
                        </div>
                    </div>
                    <div className="space-y-4 pl-10 md:pl-16">
                        {pastOnlyEnrolled.map((env, i) => (
                            <ActivityCard key={`e-${i}`} env={env} isAutoExpanded={false} variant="ENROLLED" />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ActivityCard: React.FC<{ 
    env: ActivityEntry; 
    isAutoExpanded?: boolean;
    variant?: 'ACTIVE' | 'PARTICIPATED' | 'ENROLLED';
}> = ({ env, isAutoExpanded = false, variant = 'ACTIVE' }) => {
    const [isExpanded, setIsExpanded] = React.useState(isAutoExpanded);

    const getTurnList = (entry: ActivityEntry) => {
        const turnsSet = new Set<string>();
        Object.keys(entry.scheduled_turns || {}).forEach(t => turnsSet.add(t.replace('T', '')));
        Object.keys(entry.staff_actual_location || {}).forEach(t => turnsSet.add(t.replace('T', '')));
        Object.keys(entry.actual_location || {}).forEach(t => turnsSet.add(t.replace('T', '')));
        
        if (turnsSet.size === 0) {
            return ['1', '2', '3'];
        }
        return Array.from(turnsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    };

    const turns = getTurnList(env);
    const checkins = countCompletedTurns(env);
    const totalTurns = Object.keys(env.scheduled_turns || {}).length || turns.length;

    return (
        <div 
            className={`group bg-white/[0.03] backdrop-blur-3xl border ${env.isActive ? 'border-primary/20 shadow-xl shadow-primary/5' : 'border-white/5'} rounded-2xl overflow-hidden transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 active:scale-[0.99]`}
        >
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left p-5 md:p-6 flex items-center justify-between gap-4 md:gap-6"
            >
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap select-none">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold font-display tracking-wide border ${
                            env.isActive ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white/5 text-white/30 border-white/10'
                        }`}>
                            {env.isActive ? 'In corso' : 'Archiviata'}
                        </span>
                        {env.assemblyDate && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-display bg-white/5 text-white/40 border border-white/5 tabular-nums">
                                {formatDateToIT(env.assemblyDate)}
                            </span>
                        )}
                        {checkins > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/[0.02] border border-white/5 rounded-md text-[10px] font-semibold font-display text-white/30 select-none">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 opacity-50" />
                                <span className="tabular-nums">{checkins}/{totalTurns} turni</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <p className={`text-base md:text-lg font-bold font-display tracking-tight truncate flex-1 ${variant === 'ENROLLED' ? 'text-white/20' : 'text-white shadow-sm'}`}>
                            {env.assemblyName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-5 select-none">
                    {env.isActive ? (
                        <div className="md:flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="hidden sm:inline text-[10px] font-semibold font-display tracking-wide text-primary">Live</span>
                        </div>
                    ) : checkins > 0 ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span className="hidden sm:inline text-[10px] font-semibold font-display tracking-wide text-emerald-400">Partecipato</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                            <span className="text-[10px] font-semibold font-display tracking-wide text-white/20 opacity-50">Solo iscr.</span>
                        </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-white/10 transition-transform duration-500 group-hover:text-white/40 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 md:px-6 pb-6 space-y-6">
                            <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                            
                            {/* Visualizzazione Step-by-Step */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs font-semibold font-display text-white/30 select-none">
                                    <p>Registro presenze</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            <span>Presente</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/5 border border-white/10" />
                                            <span>Assente</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative space-y-3">
                                    {/* Vertical Line for steps */}
                                    <div className="absolute left-[14px] top-4 bottom-4 w-px bg-white/5" />

                                     {turns.map((turnId, index) => {
                                         const cleanTurnId = turnId;
                                         const checkin = env.staff_actual_location?.[cleanTurnId] || 
                                                         env.staff_actual_location?.[`T${cleanTurnId}`] || 
                                                         env.actual_location?.[cleanTurnId] || 
                                                         env.actual_location?.[`T${cleanTurnId}`];
                                         const isPresent = !!checkin?.checked_in;
                                         const rawId = env.scheduled_turns?.[cleanTurnId] || env.scheduled_turns?.[`T${cleanTurnId}`];
                                         const resolvedName = env.resolved_activities?.[cleanTurnId] || env.resolved_activities?.[`T${cleanTurnId}`];
                                         const isResolved = resolvedName && resolvedName !== rawId;
                                         const activityName = checkin?.activity_id === 'STAFF' 
                                             ? 'Servizio Staff' 
                                             : (isResolved ? resolvedName : beautifyId(rawId || `Attività ${cleanTurnId}`));

                                        return (
                                            <div key={turnId} className="flex items-start gap-4 relative z-10 group/item">
                                                <div className={`mt-1.5 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 border relative ${
                                                    isPresent 
                                                        ? 'border-primary/30 text-primary shadow-lg shadow-primary/10' 
                                                        : 'border-white/5 text-white/10 grayscale-[0.5]'
                                                }`}>
                                                    <div className="absolute inset-0 bg-[#111113] rounded-lg" />
                                                    <div className={`absolute inset-0 rounded-lg ${
                                                        isPresent ? 'bg-primary/20' : 'bg-white/5'
                                                    }`} />
                                                    <span className="text-[10px] font-bold font-mono relative z-10">{index + 1}</span>
                                                </div>
                                                
                                                <div className={`flex-1 p-3.5 rounded-xl border transition-all duration-500 ${
                                                    isPresent 
                                                        ? 'bg-white/[0.03] border-white/10 group-hover/item:border-primary/20' 
                                                        : 'bg-transparent border-dashed border-white/5'
                                                }`}>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="space-y-1">
                                                            <span className={`text-xs md:text-sm font-semibold font-display block leading-tight ${
                                                                isPresent ? 'text-white' : 'text-white/20'
                                                            }`}>
                                                                {activityName}
                                                            </span>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-1.5 select-none">
                                                                    <Calendar className="w-2.5 h-2.5 text-white/10" />
                                                                    <span className="text-[10px] text-white/30 font-semibold font-display">Turno {turnId}</span>
                                                                </div>
                                                                {isPresent && (
                                                                    <div className="flex items-center gap-1.5 select-none">
                                                                        <Clock className="w-2.5 h-2.5 text-white/10" />
                                                                        <span className="text-[10px] text-emerald-400/50 font-semibold font-display">Verificato</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-display tracking-wide select-none ${
                                                            isPresent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/5 text-red-500/20'
                                                        }`}>
                                                            {isPresent ? 'Presente' : 'Assente'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                     })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
