import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Student } from "../../../types";
import { X, RefreshCw, AlertTriangle } from "lucide-react";

interface StudentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ isOpen, onClose, student }) => {
    const [scheduleDetails, setScheduleDetails] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !student.scheduled_turns) return;

        const fetchDetails = async () => {
            setLoading(true);
            const details: Record<string, string> = {};
            const activityIds = Object.values(student.scheduled_turns).filter(id => id) as string[];
            
            if (activityIds.length > 0) {
                const q = query(collection(db, "rooms"), where("__name__", "in", activityIds));
                const snap = await getDocs(q);
                snap.docs.forEach(d => {
                    details[d.id] = d.data().name || "Attività";
                });
            }
            setScheduleDetails(details);
            setLoading(false);
        };

        fetchDetails();
    }, [isOpen, student.id, student.scheduled_turns]);

    if (!isOpen) return null;

    const hasAnyCheckin = Object.values(student.actual_location || {}).some(l => l?.checked_in) ||
                          Object.values(student.staff_actual_location || {}).some(l => l?.checked_in);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            
            {/* Modal Body */}
            <div className="relative w-full max-w-md bg-[#09090b]/95 border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh] p-6 md:p-8">
                {/* Background decorative glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#0082e6]/5 rounded-full blur-[70px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex justify-between items-start mb-6 flex-shrink-0">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-lime">Scheda Studente</span>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-tight">
                            {student.lastName}<br />{student.firstName}
                        </h3>
                        <p className="text-[10px] font-bold text-white/30 truncate max-w-[280px]">{student.email}</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-full transition-colors group"
                    >
                        <X className="w-4 h-4 text-white/60 group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                {/* Quick info grid */}
                <div className="relative z-10 grid grid-cols-2 gap-3.5 mb-6 flex-shrink-0">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-white/20">Stato Check-in</p>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${hasAnyCheckin ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                            <span className="text-[10px] font-black uppercase text-white/80">
                                {hasAnyCheckin ? 'Attivo' : 'Inattivo'}
                            </span>
                        </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-white/20">Programma Orario</p>
                        <span className="text-[10px] font-black uppercase text-brand-lime italic tracking-wider">Turni Standard</span>
                    </div>
                </div>

                {/* Turn Schedule Details */}
                <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide space-y-2.5 mb-6 pr-0.5">
                    {loading ? (
                        <div className="h-28 flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 animate-spin text-brand-lime/40" />
                        </div>
                    ) : (() => {
                        const getTurnList = () => {
                            const turnsSet = new Set<string>();
                            Object.keys(student.scheduled_turns || {}).forEach(t => turnsSet.add(t.replace('T', '')));
                            Object.keys(student.staff_actual_location || {}).forEach(t => turnsSet.add(t.replace('T', '')));
                            Object.keys(student.actual_location || {}).forEach(t => turnsSet.add(t.replace('T', '')));
                            if (turnsSet.size === 0) return ['1', '2', '3'];
                            return Array.from(turnsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                        };

                        return getTurnList().map((tId) => {
                            const checkin = student.staff_actual_location?.[tId] || 
                                            student.staff_actual_location?.[`T${tId}`] || 
                                            student.actual_location?.[tId] || 
                                            student.actual_location?.[`T${tId}`];
                            const isPresentHere = !!checkin?.checked_in;
                            const actId = student.scheduled_turns?.[tId] || student.scheduled_turns?.[`T${tId}`];
                            const isStaff = checkin?.activity_id === 'STAFF';
                            
                            const activityName = isStaff 
                                ? 'Servizio Staff' 
                                : (actId ? (scheduleDetails[actId] || 'Caricamento...') : 'Nessuna Attività');

                            return (
                                <div 
                                    key={tId} 
                                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                        isPresentHere 
                                            ? 'bg-[#0082e6]/5 border-primary/20' 
                                            : 'bg-white/[0.02] border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${
                                            isPresentHere ? 'bg-brand-lime text-black' : 'bg-white/5 text-white/40'
                                        }`}>
                                            T{tId}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="text-xs font-black uppercase text-white truncate">
                                                {activityName}
                                            </p>
                                            {isPresentHere && (
                                                <p className="text-[7.5px] font-black text-[#0082e6] uppercase tracking-widest mt-0.5 truncate">
                                                    {isStaff ? 'Verificato come Staff' : `Presente in: ${checkin?.activity_id?.split('_')?.pop()?.replace(/-/g, ' ')}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Alert warning box */}
                <div className="relative z-10 bg-amber-500/[0.02] border border-amber-500/10 p-4 rounded-xl flex gap-3.5 items-start mb-6 flex-shrink-0">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Nota per il Gestore</p>
                        <p className="text-[7.5px] font-bold text-amber-500/50 leading-relaxed uppercase">
                            Ogni modifica manuale o check-in forzato viene salvato per ragioni di sicurezza e conformità scolastica.
                        </p>
                    </div>
                </div>

                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="relative z-10 w-full py-3.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 text-white/60 hover:text-white flex-shrink-0 btn-press"
                >
                    Chiudi Scheda
                </button>
            </div>
        </div>
    );
};
