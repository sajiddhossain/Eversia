import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, ChevronRight, Ticket } from 'lucide-react';
import type { Assembly, Activity } from '../../../../types';
import { formatDateToISO } from '../../../../utils/dateUtils';

interface AgendaItem {
    assembly: Assembly;
    turns: {
        turnId: string;
        activity: Activity | null;
    }[];
}

interface AgendaListProps {
    groupedAgenda: AgendaItem[];
    onSelectTurn?: (turnId: string) => void;
    onViewActivityInfo?: (activity: Activity, assembly: Assembly) => void;
}

const AgendaList: React.FC<AgendaListProps> = ({ groupedAgenda, onSelectTurn, onViewActivityInfo }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold italic tracking-tight font-display mb-8 flex items-center gap-3 text-white">
                <Clock className="w-6 h-6 text-primary" />
                La mia agenda
            </h2>

            {groupedAgenda.length > 0 ? (
                <div className="space-y-6">
                    {groupedAgenda.map((group) => (
                        <div
                            key={group.assembly.id}
                            className="group relative bg-white/[0.03] border border-white/10 rounded-3xl md:rounded-[2.5rem] overflow-hidden hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500"
                        >
                            <div className="p-5 md:p-8 pb-4">
                                <p className="text-xs font-semibold tracking-wider text-brand-lime/50 mb-2 tabular-nums">{group.assembly.date}</p>
                                <h3 className="text-xl md:text-2xl font-bold italic text-white leading-none tracking-tight font-display mb-6 group-hover:text-brand-lime transition-colors">
                                    {group.assembly.name}
                                </h3>

                                 <div className="space-y-3">
                                     {group.turns.map((turn) => {
                                         const isoDate = group.assembly.date ? formatDateToISO(group.assembly.date) : '';
                                         const sched = group.assembly.turn_schedules?.[turn.turnId];
                                         
                                         const startTime = (sched?.start && isoDate) ? new Date(`${isoDate}T${sched.start}`) : null;
                                         const endTime = (sched?.end && isoDate) ? new Date(`${isoDate}T${sched.end}`) : null;
                                         
                                         const timeStr = startTime && !isNaN(startTime.getTime()) && endTime && !isNaN(endTime.getTime())
                                             ? `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                             : null;

                                         return (
                                             <motion.div
                                                 key={turn.turnId}
                                                 whileHover={{ scale: 1.005 }}
                                                 whileTap={{ scale: 0.995 }}
                                                 onClick={() => turn.activity ? onViewActivityInfo?.(turn.activity, group.assembly) : onSelectTurn?.(turn.turnId)}
                                                 className={`flex items-center gap-4 p-4 border rounded-2xl group/turn transition-all duration-300 relative overflow-hidden btn-press cursor-pointer ${
                                                     turn.activity 
                                                         ? 'bg-white/[0.02] border-white/5 hover:border-brand-lime/30 hover:bg-white/[0.04]' 
                                                         : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                                                 }`}
                                             >
                                                 {/* Ticket notch cutouts */}
                                                 <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 rounded-full bg-[#09090b] border-r border-white/5 z-10" />
                                                 <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 rounded-full bg-[#09090b] border-l border-white/5 z-10" />

                                                 {/* Turn indicator */}
                                                 <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all ${
                                                     turn.activity 
                                                         ? 'bg-white/5 border-white/5 group-hover/turn:bg-brand-lime/[0.08] group-hover/turn:border-brand-lime/25' 
                                                         : 'bg-red-500/10 border-red-500/20 group-hover/turn:bg-red-500/20'
                                                 }`}>
                                                     <span className={`text-[11px] font-bold tracking-tight uppercase ${
                                                         turn.activity ? 'text-brand-lime/75 group-hover/turn:text-brand-lime' : 'text-red-400'
                                                     }`}>
                                                         T{turn.turnId.split('_').pop() || turn.turnId}
                                                     </span>
                                                     {startTime && !isNaN(startTime.getTime()) && (
                                                         <span className="text-[8px] font-semibold text-white/20 tabular-nums">
                                                             {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                         </span>
                                                     )}
                                                 </div>

                                                 {/* Dashed Separator */}
                                                 <div className="h-8 border-l border-dashed border-white/10 shrink-0" />

                                                 <div className="flex-1 min-w-0">
                                                     <div className="flex items-center gap-2 mb-1">
                                                         <h4 className={`text-sm font-semibold tracking-tight truncate transition-colors ${
                                                             turn.activity ? 'text-white/90 group-hover/turn:text-white' : 'text-red-300'
                                                         }`}>
                                                             {turn.activity ? turn.activity.name : 'Attività non prenotata'}
                                                         </h4>
                                                     </div>
                                                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                         {turn.activity ? (
                                                             <>
                                                                  {(turn.activity.room_name || turn.activity.location_name) && (
                                                                      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                                                                          <MapPin className="w-3 h-3 text-brand-lime/40" /> 
                                                                          {turn.activity.room_name || turn.activity.location_name}
                                                                          {(turn.activity.location_floor || turn.activity.location_number) && ` (${[
                                                                              turn.activity.location_floor && `Piano ${turn.activity.location_floor}`,
                                                                              turn.activity.location_number && `Aula ${turn.activity.location_number}`
                                                                          ].filter(Boolean).join(' • ')})`}
                                                                      </p>
                                                                  )}
                                                             </>
                                                         ) : (
                                                             <p className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                                                                 Prenota ora per assicurarti il posto
                                                             </p>
                                                         )}
                                                         {timeStr && (
                                                             <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider flex items-center gap-1.5 tabular-nums">
                                                                 <Clock className="w-3 h-3" /> {timeStr}
                                                             </p>
                                                         )}
                                                     </div>
                                                 </div>
                                                 
                                                 <ChevronRight className={`w-4 h-4 transition-all ${
                                                     turn.activity ? 'text-white/10 group-hover/turn:text-brand-lime' : 'text-red-400 animate-bounce'
                                                 } group-hover/turn:translate-x-1`} />
                                             </motion.div>
                                         );
                                     })}
                                 </div>
                             </div>
                             <div className="bg-brand-lime/[0.02] px-5 md:px-8 py-4 flex items-center justify-between border-t border-white/[0.04]">
                                 <div className="flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-brand-lime shadow-[0_0_8px_rgba(226,243,60,0.8)] animate-pulse" />
                                     <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-lime/60">Prenotazione confermata</span>
                                 </div>
                                 <div className="flex -space-x-2">
                                     {[1, 2].map(i => (
                                         <div key={i} className="w-7 h-7 rounded-md bg-white/5 border border-[#121214] flex items-center justify-center rotate-6">
                                             <div className="w-full h-full rounded-md bg-gradient-to-br from-white/10 to-transparent" />
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
            ) : (
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-50 group-hover:scale-75 transition-transform duration-1000 opacity-50" />
                    <div className="relative p-6 sm:p-16 text-center bg-white/[0.02] border border-white/10 rounded-3xl md:rounded-[2.5rem] backdrop-blur-3xl overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 group-hover:rotate-12 transition-transform duration-500 shadow-2xl">
                            <Ticket className="w-10 h-10 text-primary/40 group-hover:text-primary transition-colors" />
                        </div>
                        
                        <h3 className="text-xl font-bold font-display italic text-white mb-3">La tua agenda è vuota</h3>
                        <p className="text-xs text-white/30 font-medium leading-relaxed max-w-[240px] mx-auto mb-8">
                            Prenota un evento e inizia la tua esperienza.
                        </p>
                        
                        <motion.button 
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onSelectTurn?.('1')}
                            className="px-8 py-4 bg-brand-lime text-black rounded-2xl text-xs font-semibold tracking-wider hover:shadow-[0_0_30px_rgba(226,243,60,0.4)] transition-all btn-press cursor-pointer"
                        >
                            Inizia a prenotare
                        </motion.button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaList;
