import React, { useState } from "react";
import type { Student, Activity } from '../../../types';
import { X, Search, MapPin, Calendar, AlertTriangle, Clock } from "lucide-react";

interface Props {
    students: Student[];
    activities: Activity[];
    currentTurn: string;
    onClose: () => void;
}

export const StudentLocator: React.FC<Props> = ({ students, activities, onClose }) => {
    const [searchText, setSearchText] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const activityMap = new Map(activities.map(a => [a.id, a]));

    const filtered = searchText.length < 2 ? [] : students.filter(s =>
        `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(searchText.toLowerCase())
    ).slice(0, 20);

    const getStudentStatus = (s: Student) => {
        const isStaff = (s.staff_actual_location && Object.values(s.staff_actual_location).some(loc => loc?.activity_id === 'STAFF')) ||
                        (s.actual_location && Object.values(s.actual_location).some(loc => loc?.activity_id === 'STAFF'));
        if (isStaff) {
            return { label: "Servizio Staff", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
        }

        const hasCheckin = (s.staff_actual_location && Object.values(s.staff_actual_location).some(loc => loc?.checked_in)) ||
                           (s.actual_location && Object.values(s.actual_location).some(loc => loc?.checked_in));
        if (!hasCheckin) {
            const hasSchedule = Object.keys(s.scheduled_turns || {}).length > 0;
            if (!hasSchedule) {
                return { label: "NON ISCRITTO", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
            }
            return { label: "Assente", color: "text-red-400 bg-red-500/10 border-red-500/20" };
        }

        // Check for gatecrasher
        const turns = Object.keys(s.scheduled_turns || {});
        for (const turnId of turns) {
            const scheduled = s.scheduled_turns?.[turnId];
            const actual = (s.staff_actual_location as any)?.[turnId] || (s.actual_location as any)?.[turnId];
            if (actual?.checked_in && scheduled && actual.activity_id !== scheduled) {
                return { label: "Imbucato", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
            }
        }
        return { label: "Regolare", color: "text-green-400 bg-green-500/10 border-green-500/20" };
    };

    const renderStudentDetail = (s: Student) => {
        const status = getStudentStatus(s);
        const allTurns = ["1", "2", "3"];

        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                {/* Student header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-xl text-primary border border-primary/20">
                            {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                        <div>
                            <h3 className="text-xl font-black">{s.firstName} {s.lastName}</h3>
                            <p className="text-white/40 text-sm">{s.email}</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${status.color}`}>
                        {status.label}
                    </span>
                </div>

                {/* Turn-by-turn breakdown */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Dettaglio per Turno</h4>
                    {allTurns.map(turnId => {
                        const scheduled = s.scheduled_turns?.[turnId];
                        const actual = (s.staff_actual_location as any)?.[turnId] || 
                                       (s.staff_actual_location as any)?.[`T${turnId}`] || 
                                       (s.actual_location as any)?.[turnId] || 
                                       (s.actual_location as any)?.[`T${turnId}`];
                        const scheduledActivity = scheduled ? activityMap.get(scheduled) : null;
                        const actualActivity = actual?.activity_id ? activityMap.get(actual.activity_id) : null;
                        const isMismatch = actual?.checked_in && scheduled && actual.activity_id !== scheduled && actual.activity_id !== 'STAFF';

                        return (
                            <div key={turnId} className={`bg-white/2 border rounded-2xl p-5 ${isMismatch ? 'border-amber-500/30' : 'border-white/5'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-black">T{turnId}</span>
                                    {isMismatch && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Prenotato
                                        </div>
                                        <p className="text-sm font-bold text-white/70">
                                            {scheduledActivity?.name || (scheduled ? scheduled : <span className="text-white/20 italic">—</span>)}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> Posizione Effettiva
                                        </div>
                                        <p className={`text-sm font-bold ${actual?.checked_in ? (actual.activity_id === 'STAFF' ? 'text-blue-400' : isMismatch ? 'text-amber-400' : 'text-green-400') : 'text-white/20'}`}>
                                            {actual?.checked_in ? (actual.activity_id === 'STAFF' ? 'Servizio Staff' : (actualActivity?.name || actual.activity_id)) : <span className="italic">Non registrato</span>}
                                        </p>
                                    </div>
                                </div>
                                {actual?.markedAt && (
                                    <div className="flex items-center gap-2 mt-3 text-[9px] text-white/20 font-bold">
                                        <Clock className="w-3 h-3" />
                                        <span>Check-in: {new Date(actual.markedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
                                        <span>• da {actual.markedBy?.split('@')[0]}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl"><Search className="w-6 h-6 text-blue-400" /></div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest">Cerca Studente</h2>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{students.length} studenti nell'assemblea</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6" /></button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-white/5">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Cerca per nome, cognome o email..."
                            className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-bold text-lg"
                            value={searchText}
                            onChange={e => { setSearchText(e.target.value); setSelectedStudent(null); }}
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6">
                    {selectedStudent ? (
                        <div>
                            <button onClick={() => setSelectedStudent(null)} className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 hover:underline">
                                ← Torna ai risultati
                            </button>
                            {renderStudentDetail(selectedStudent)}
                        </div>
                    ) : searchText.length < 2 ? (
                        <div className="text-center py-16 text-white/20">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-bold">Digita almeno 2 caratteri per cercare</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-white/20">
                            <p className="font-bold">Nessuno studente trovato</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(s => {
                                const status = getStudentStatus(s);
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedStudent(s)}
                                        className="w-full text-left bg-white/2 border border-white/5 rounded-2xl p-5 hover:bg-white/5 transition-all flex items-center justify-between gap-4 group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-sm text-white/30 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
                                                {s.firstName?.[0]}{s.lastName?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold truncate">{s.firstName} {s.lastName}</p>
                                                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{s.email}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shrink-0 ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
