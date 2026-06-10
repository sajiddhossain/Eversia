import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, doc, getDocs, runTransaction } from "firebase/firestore";
import type { Student, Activity } from '../../types';
import { Trash2, Search, Loader2, UserPlus, GraduationCap, RefreshCw } from "lucide-react";
import { MasterExport } from "./MasterExport";
import { logAudit } from "../../utils/auditLogger";
import { useAuth } from "../../hooks/useAuth";

interface StudentManagerProps {
    assemblyId: string;
    onClose: () => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ assemblyId }) => {
    const { userProfile } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [newStudent, setNewStudent] = useState<Partial<Student>>({
        firstName: "",
        lastName: "",
        email: "",
        className: "",
        scheduled_turns: {}
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const qS = query(collection(db, "students"), where("assemblyId", "==", assemblyId));
            const qA = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
            
            const [studentsSnap, activitiesSnap] = await Promise.all([
                getDocs(qS),
                getDocs(qA)
            ]);
            
            setStudents(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
            setActivities(activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
            setLastUpdated(new Date());
        } catch (error) {
            console.error("[StudentManager] Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [assemblyId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudent.email || !newStudent.firstName || !newStudent.lastName) return;
        setIsSaving(true);

        const email = newStudent.email.toLowerCase().trim();
        const studentId = `${assemblyId}_${email}`;
        const studentRef = doc(db, "students", studentId);

        const studentData: Student = {
            id: studentId,
            email,
            firstName: newStudent.firstName.trim(),
            lastName: newStudent.lastName.trim(),
            assemblyId,
            scheduled_turns: newStudent.scheduled_turns || {},
            actual_location: null
        };

        if (newStudent.className) {
            studentData.className = newStudent.className.trim().toUpperCase();
        }

        try {
            await runTransaction(db, async (transaction) => {
                const studentSnap = await transaction.get(studentRef);
                if (studentSnap.exists()) {
                    throw new Error("Uno studente con questa email è già registrato in questa assemblea.");
                }
                transaction.set(studentRef, studentData);
            });

            // Log Audit Event
            const details = `Aggiunto studente: ${studentData.firstName} ${studentData.lastName} (${studentData.email})${studentData.className ? ` - Classe: ${studentData.className}` : ''}`;
            await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', details, assemblyId, studentId);

            setNewStudent({ firstName: "", lastName: "", email: "", className: "", scheduled_turns: {} });
        } catch (error: any) {
            console.error("Error creating student:", error);
            alert(error.message || "Errore durante la creazione dello studente.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const studentRef = doc(db, "students", id);
        try {
            let deletedStudentName = "";
            let deletedStudentEmail = "";

            await runTransaction(db, async (transaction) => {
                const studentSnap = await transaction.get(studentRef);
                if (!studentSnap.exists()) return;

                const studentData = studentSnap.data() as Student;
                deletedStudentName = `${studentData.firstName} ${studentData.lastName}`;
                deletedStudentEmail = studentData.email;

                const turns = studentData.scheduled_turns || {};
                const bookedActivities = Object.entries(turns).filter(([_, actId]) => !!actId) as [string, string][];

                // Fetch all booked activities to decrement their counts
                const actRefs = bookedActivities.map(([turnId, actId]) => ({
                    ref: doc(db, "rooms", actId),
                    turnId
                }));

                const actSnaps = await Promise.all(actRefs.map(item => transaction.get(item.ref)));

                // Delete the student document
                transaction.delete(studentRef);

                // Decrement counts for each booked activity
                actRefs.forEach((item, index) => {
                    const snap = actSnaps[index];
                    if (snap.exists()) {
                        const currentCount = snap.data().counts_by_turn?.[item.turnId] || 0;
                        transaction.update(item.ref, {
                            [`counts_by_turn.${item.turnId}`]: Math.max(0, currentCount - 1)
                        });
                    }
                });
            });

            if (deletedStudentEmail) {
                const details = `Rimosso studente: ${deletedStudentName} (${deletedStudentEmail})`;
                await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', details, assemblyId, id);
            }

            setConfirmDeleteId(null);
        } catch (error) {
            console.error("Error deleting student transactionally:", error);
        }
    };

    const updateStudentTurn = async (studentId: string, turnId: string, activityId: string) => {
        const studentRef = doc(db, "students", studentId);
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const oldActivityId = student.scheduled_turns?.[turnId] || null;
        const normalizedNewActivityId = activityId || null;
        if (oldActivityId === normalizedNewActivityId) return;

        try {
            let studentName = `${student.firstName} ${student.lastName}`;
            let studentEmail = student.email;
            let oldActivityName = "";
            let newActivityName = "";

            await runTransaction(db, async (transaction) => {
                // Fetch student document inside the transaction to ensure consistency
                const studentSnap = await transaction.get(studentRef);
                if (!studentSnap.exists()) return;

                const studentData = studentSnap.data() as Student;
                const currentOldActivityId = studentData.scheduled_turns?.[turnId] || null;

                // Double check if activity didn't change in the meantime
                if (currentOldActivityId === normalizedNewActivityId) return;

                const updatedTurns = { ...(studentData.scheduled_turns || {}), [turnId]: normalizedNewActivityId };
                if (!normalizedNewActivityId) delete updatedTurns[turnId];

                // Fetch room docs if needed
                let oldActSnap = null;
                let newActSnap = null;

                if (currentOldActivityId) {
                    const oldActRef = doc(db, "rooms", currentOldActivityId);
                    oldActSnap = await transaction.get(oldActRef);
                }

                if (normalizedNewActivityId) {
                    const newActRef = doc(db, "rooms", normalizedNewActivityId);
                    newActSnap = await transaction.get(newActRef);
                }

                // Apply updates
                transaction.update(studentRef, { scheduled_turns: updatedTurns });

                if (currentOldActivityId && oldActSnap && oldActSnap.exists()) {
                    const oldActData = oldActSnap.data();
                    oldActivityName = oldActData.name || currentOldActivityId;
                    const oldCount = oldActData.counts_by_turn?.[turnId] || 0;
                    transaction.update(oldActSnap.ref, {
                        [`counts_by_turn.${turnId}`]: Math.max(0, oldCount - 1)
                    });
                }

                if (normalizedNewActivityId && newActSnap && newActSnap.exists()) {
                    const newActData = newActSnap.data();
                    newActivityName = newActData.name || normalizedNewActivityId;
                    const newCount = newActData.counts_by_turn?.[turnId] || 0;
                    transaction.update(newActSnap.ref, {
                        [`counts_by_turn.${turnId}`]: newCount + 1
                    });
                }
            });

            // Construct details
            let details = "";
            if (oldActivityId && normalizedNewActivityId) {
                details = `Modificato turno ${turnId} per lo studente ${studentName} (${studentEmail}): spostato da "${oldActivityName}" a "${newActivityName}"`;
            } else if (normalizedNewActivityId) {
                details = `Iscritto studente ${studentName} (${studentEmail}) a "${newActivityName}" per il turno ${turnId}`;
            } else {
                details = `Rimossa iscrizione dello studente ${studentName} (${studentEmail}) per il turno ${turnId} (precedentemente iscritto a "${oldActivityName}")`;
            }

            await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', details, assemblyId, studentId);
        } catch (error) {
            console.error("Error updating turn transactionally:", error);
        }
    };

    const filteredStudents = students.filter(s =>
        `${s.firstName} ${s.lastName} ${s.email} ${s.className || ""}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.01] backdrop-blur-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest italic flex items-center gap-3">
                        <GraduationCap className="w-6 h-6 text-primary" /> Lista Studenti
                    </h2>
                    <p className="text-white/20 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Gestione iscritti e assegnazione posti (Total: {students.length})</p>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <div className="text-right hidden sm:block">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Ultimo aggiornamento</p>
                            <p className="text-[10px] font-bold text-white/40">{lastUpdated.toLocaleTimeString("it-IT")}</p>
                        </div>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex btn-press items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all group disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        <span>Aggiorna</span>
                    </button>
                    <MasterExport assemblyId={assemblyId} />
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Left Panel: Add Student */}
                <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/5 p-6 md:p-8 space-y-6 bg-black/20 overflow-y-auto custom-scrollbar">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Nuovo Studente
                    </h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Email</label>
                            <input
                                required
                                type="email"
                                className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 transition-all font-bold focus:ring-1 focus:ring-primary/10"
                                value={newStudent.email || ""}
                                onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Nome</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 transition-all font-bold focus:ring-1 focus:ring-primary/10"
                                value={newStudent.firstName || ""}
                                onChange={e => setNewStudent({ ...newStudent, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Cognome</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 transition-all font-bold focus:ring-1 focus:ring-primary/10"
                                value={newStudent.lastName || ""}
                                onChange={e => setNewStudent({ ...newStudent, lastName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Classe / Sezione</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 transition-all font-bold focus:ring-1 focus:ring-primary/10"
                                placeholder="es. 5BS (Opzionale)"
                                value={newStudent.className || ""}
                                onChange={e => setNewStudent({ ...newStudent, className: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2 lg:col-span-1 pt-2">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-primary text-black font-black py-4 rounded-xl uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-lg shadow-primary/10 btn-press"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aggiungi al Registro"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Panel: List & Search */}
                <div className="flex-1 flex flex-col min-w-0 bg-white/[0.01]">
                    <div className="p-5 md:p-6 border-b border-white/5 backdrop-blur-md sticky top-0 z-10 bg-surface/50">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold outline-none focus:border-primary/50 transition-all placeholder:text-white/5 focus:ring-1 focus:ring-primary/10"
                                placeholder="Cerca per nome, cognome o email..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
                        {loading && students.length === 0 ? (
                            <div className="py-24 text-center">
                                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                                <p className="text-white/20 uppercase font-black text-[10px] tracking-widest italic">Caricamento registro studenti...</p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table View */}
                                <div className="hidden md:block">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-white/10">
                                        <th className="px-6 py-2">Identità Studente</th>
                                        <th className="px-6 py-2 text-center w-52">Turno 1</th>
                                        <th className="px-6 py-2 text-center w-52">Turno 2</th>
                                        <th className="px-6 py-2 text-center w-52">Turno 3</th>
                                        <th className="px-6 py-2 text-right w-36">Opzioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className="group bg-white/[0.01] hover:bg-white/[0.03] transition-all border border-white/5">
                                            <td className="px-6 py-4 rounded-l-2xl border-l border-t border-b border-white/5">
                                                <div className="font-bold flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black text-white/40 border border-white/10 shrink-0">
                                                        {student.firstName[0]}{student.lastName[0]}
                                                    </div>
                                                    <div className="min-w-0 pr-2">
                                                        <div className="font-black text-sm uppercase tracking-tight truncate flex items-center gap-2">
                                                            {student.lastName} {student.firstName}
                                                            {student.className && (
                                                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-bold text-white/40 leading-none">
                                                                    {student.className}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-white/20 font-bold italic tracking-wider break-all">{student.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-t border-b border-white/5">
                                                <select
                                                    className="w-full bg-black/40 text-[10px] font-black uppercase border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary/50 transition-all appearance-none text-center cursor-pointer"
                                                    value={student.scheduled_turns["1"] || ""}
                                                    onChange={e => updateStudentTurn(student.id, "1", e.target.value)}
                                                >
                                                    <option value="">- LIBERO -</option>
                                                    {activities.filter(a => a.turn_ids?.includes("1")).map(a => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 border-t border-b border-white/5">
                                                <select
                                                    className="w-full bg-black/40 text-[10px] font-black uppercase border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary/50 transition-all appearance-none text-center cursor-pointer"
                                                    value={student.scheduled_turns["2"] || ""}
                                                    onChange={e => updateStudentTurn(student.id, "2", e.target.value)}
                                                >
                                                    <option value="">- LIBERO -</option>
                                                    {activities.filter(a => a.turn_ids?.includes("2")).map(a => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 border-t border-b border-white/5">
                                                <select
                                                    className="w-full bg-black/40 text-[10px] font-black uppercase border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary/50 transition-all appearance-none text-center cursor-pointer"
                                                    value={student.scheduled_turns["3"] || ""}
                                                    onChange={e => updateStudentTurn(student.id, "3", e.target.value)}
                                                >
                                                    <option value="">- LIBERO -</option>
                                                    {activities.filter(a => a.turn_ids?.includes("3")).map(a => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 rounded-r-2xl border-r border-t border-b border-white/5 text-right">
                                                {confirmDeleteId === student.id ? (
                                                    <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                                        <span className="text-[9px] font-black text-red-400 uppercase tracking-widest shrink-0">Eliminare?</span>
                                                        <button
                                                            onClick={() => handleDelete(student.id)}
                                                            className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-[9px] font-black uppercase hover:bg-red-500/30 transition-all"
                                                        >
                                                            Sì
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2.5 py-1 bg-white/5 text-white/60 rounded-lg text-[9px] font-black uppercase hover:bg-white/10 transition-all"
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDeleteId(student.id)}
                                                        className="p-3 text-white/5 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 btn-press"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {filteredStudents.map(student => (
                                <div key={student.id} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-5 space-y-4 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                                                {student.firstName[0]}{student.lastName[0]}
                                            </div>
                                            <div className="min-w-0 pr-2">
                                                <p className="font-black text-sm uppercase tracking-tight leading-tight mb-0.5 flex items-center gap-2">
                                                    {student.lastName} {student.firstName}
                                                    {student.className && (
                                                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-bold text-white/40 leading-none">
                                                            {student.className}
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-[10px] text-white/20 font-bold italic lowercase break-all">{student.email}</p>
                                            </div>
                                        </div>
                                        {confirmDeleteId === student.id ? (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                                <button
                                                    onClick={() => handleDelete(student.id)}
                                                    className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-[9px] font-black uppercase"
                                                >
                                                    Sì
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-2.5 py-1 bg-white/5 text-white/60 rounded-lg text-[9px] font-black uppercase"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteId(student.id)}
                                                className="p-2 text-white/10 active:text-red-500 btn-press"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/20 ml-1">Turno 1</label>
                                            <select
                                                className="w-full bg-black/40 text-[9px] font-black uppercase border border-white/10 rounded-xl px-2 py-3 outline-none focus:border-primary/50 text-center appearance-none"
                                                value={student.scheduled_turns["1"] || ""}
                                                onChange={e => updateStudentTurn(student.id, "1", e.target.value)}
                                            >
                                                <option value="">LIBERO</option>
                                                {activities.filter(a => a.turn_ids?.includes("1")).map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/20 ml-1">Turno 2</label>
                                            <select
                                                className="w-full bg-black/40 text-[9px] font-black uppercase border border-white/10 rounded-xl px-2 py-3 outline-none focus:border-primary/50 text-center appearance-none"
                                                value={student.scheduled_turns["2"] || ""}
                                                onChange={e => updateStudentTurn(student.id, "2", e.target.value)}
                                            >
                                                <option value="">LIBERO</option>
                                                {activities.filter(a => a.turn_ids?.includes("2")).map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5 col-span-2">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/20 ml-1">Turno 3</label>
                                            <select
                                                className="w-full bg-black/40 text-[9px] font-black uppercase border border-white/10 rounded-xl px-2 py-3 outline-none focus:border-primary/50 text-center appearance-none"
                                                value={student.scheduled_turns["3"] || ""}
                                                onChange={e => updateStudentTurn(student.id, "3", e.target.value)}
                                            >
                                                <option value="">LIBERO</option>
                                                {activities.filter(a => a.turn_ids?.includes("3")).map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredStudents.length === 0 && (
                            <div className="py-24 text-center">
                                <Search className="w-12 h-12 text-white/5 mx-auto mb-4" />
                                <p className="text-white/20 uppercase font-black text-[10px] tracking-widest italic">Nessuno studente corrispondente ai criteri</p>
                            </div>
                        )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
