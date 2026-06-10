import React, { useState, useEffect } from "react";
import { db, functions } from "../../firebase";
import { doc, collection, query, where, onSnapshot, getDocs, updateDoc, setDoc, deleteField, serverTimestamp, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { Activity, Assembly, Student } from '../../types';
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { 
    Shield, ArrowLeft, Building2, AlertTriangle, 
    CheckCircle2, X, UserCheck, SearchX, Search,
    RefreshCw, Calendar, Check, Loader2
} from "lucide-react";

const StudentScheduleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    currentTurn: string;
}> = ({ isOpen, onClose, student, currentTurn }) => {
    const [activityNames, setActivityNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchNames = async () => {
            setLoading(true);
            const scheduledIds = Object.values(student.scheduled_turns || {}).filter(id => id) as string[];
            const actualIds = [
                ...Object.values(student.actual_location || {}).map(l => l?.activity_id),
                ...Object.values(student.staff_actual_location || {}).map(l => l?.activity_id)
            ].filter(id => id) as string[];
            const allIds = Array.from(new Set([...scheduledIds, ...actualIds]));
            
            if (allIds.length > 0) {
                try {
                    const q = query(collection(db, "rooms"), where("__name__", "in", allIds));
                    const snap = await getDocs(q);
                    const names: Record<string, string> = {};
                    snap.docs.forEach(d => {
                        names[d.id] = d.data().name || "Attività";
                    });
                    setActivityNames(names);
                } catch (e) {
                    console.error("Error fetching names for modal:", e);
                }
            }
            setLoading(false);
        };

        fetchNames();
    }, [isOpen, student.id]);

    if (!isOpen) return null;

    const currentLoc = student.staff_actual_location?.[currentTurn] || 
                       student.staff_actual_location?.[`T${currentTurn}`] || 
                       student.actual_location?.[currentTurn] || 
                       student.actual_location?.[`T${currentTurn}`];
    const isPresentNow = currentLoc?.checked_in;
    const currentActivityName = isPresentNow
        ? (currentLoc.activity_id === 'STAFF' ? 'Servizio Staff' : (activityNames[currentLoc.activity_id] || "In Sede"))
        : "Assente/Non in aula";

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500">
                <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Profilo Studente</span>
                            <h3 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-tight">
                                {student.lastName}<br />{student.firstName}
                            </h3>
                            <p className="text-xs font-bold text-white/30 lowercase tracking-widest">{student.email}</p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
                            <X className="w-5 h-5 group-hover:rotate-90 transition-transform text-white/40 group-hover:text-white" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Stato Turno {currentTurn}</p>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${isPresentNow ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                                    <span className="text-xs font-black uppercase text-white/80">
                                        {isPresentNow ? 'Presente' : 'Non Trovato'}
                                    </span>
                                </div>
                                {isPresentNow && (
                                    <span className="text-[8px] font-bold text-emerald-500 uppercase truncate">
                                        {currentActivityName}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Verifica</p>
                            <span className="text-xs font-black uppercase text-amber-500 italic">Security Pass</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="max-h-[40vh] overflow-y-auto no-scrollbar space-y-3">
                        {loading ? (
                            <div className="py-12 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-amber-500/40" /></div>
                        ) : Object.entries(student.scheduled_turns || {}).sort(([a], [b]) => a.localeCompare(b)).map(([tId, actId]) => {
                            const locData = student.staff_actual_location?.[tId] || 
                                            student.staff_actual_location?.[`T${tId}`] || 
                                            student.actual_location?.[tId] || 
                                            student.actual_location?.[`T${tId}`];
                            const isPresentHere = locData?.checked_in;
                            const isGatecrasher = isPresentHere && locData.activity_id !== actId && locData.activity_id !== 'STAFF';

                            return (
                                <div key={tId} className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all ${isPresentHere ? (locData.activity_id === 'STAFF' ? 'bg-blue-500/5 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]' : 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]') : 'bg-white/[0.02] border-white/5'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black ${isPresentHere ? (locData.activity_id === 'STAFF' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-amber-500 text-black shadow-lg shadow-amber-500/20') : 'bg-white/5 text-white/40'}`}>
                                            T{tId}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-0.5">Programmato</p>
                                            <p className="text-[10px] font-black uppercase text-white/80 truncate">{activityNames[actId || ''] || 'Nessuna Attività'}</p>
                                            {isPresentHere && (
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Rilevato a</p>
                                                    <p className={`text-[10px] font-black uppercase ${isGatecrasher ? 'text-red-500' : locData.activity_id === 'STAFF' ? 'text-blue-500' : 'text-emerald-500'}`}>
                                                        {locData.activity_id === 'STAFF' ? 'Servizio Staff' : (activityNames[locData.activity_id] || locData.activity_id.split('_').pop())}
                                                        {isGatecrasher && " ⚠️"}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {isPresentHere && <UserCheck className={`w-5 h-5 ${isGatecrasher ? 'text-red-500' : locData.activity_id === 'STAFF' ? 'text-blue-500' : 'text-emerald-500'}`} />}
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-[2rem] flex gap-4 items-start">
                        <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Security Clearance</p>
                            <p className="text-[10px] font-bold text-amber-500/60 leading-relaxed uppercase">
                                I dati sono aggiornati in tempo reale. In caso di incongruenze, verifica l'appello con il Room Manager.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-6 pt-0">
                    <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 text-white/60">
                        Chiudi Rapporto
                    </button>
                </div>
            </div>
        </div>
    );
};

interface StudentListModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: Activity;
    turnId: string;
}

const StudentListModal: React.FC<StudentListModalProps> = ({ isOpen, onClose, activity, turnId }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !activity.id) return;

        setLoading(true);
        const q = query(
            collection(db, "students"),
            where(`actual_location.${turnId}.activity_id`, "==", activity.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Student));
            setStudents(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, activity.id, turnId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500">
                {/* Modal Header */}
                <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    Turno {turnId}
                                </span>
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Presenze Live</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-tight">
                                {activity.name}
                            </h3>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                                <Building2 className="w-3 h-3" />
                                {activity.location_name}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white group">
                            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                style={{ width: `${Math.min(100, (students.length / (activity.max_capacity || 1)) * 100)}%` }}
                        />
                        </div>
                        <span className="text-xs font-black italic text-white">
                            {students.length} <span className="text-white/20 not-italic">/ {activity.max_capacity}</span>
                        </span>
                    </div>
                </div>

                {/* Students List */}
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 no-scrollbar pb-12">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-30">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Caricamento...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="py-20 text-center space-y-4 opacity-20">
                            <SearchX className="w-12 h-12 mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Nessun presente</p>
                        </div>
                    ) : (
                        students
                            .sort((a, b) => a.lastName.localeCompare(b.lastName))
                            .map(student => {
                                const isScheduled = student.scheduled_turns?.[turnId] === activity.id;
                                return (
                                    <div 
                                        key={student.id}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group"
                                    >
                                        <div className="min-w-0 pr-4">
                                            <h4 className="font-black text-sm uppercase text-white truncate group-hover:text-amber-500 transition-colors">
                                                {student.lastName} {student.firstName}
                                            </h4>
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest truncate">
                                                {student.email}
                                            </p>
                                        </div>
                                        <div className={`shrink-0 px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                            isScheduled 
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                                                : 'bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                        }`}>
                                            {isScheduled ? <UserCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                            {isScheduled ? 'Regolare' : 'Imbucato'}
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>
        </div>
    );
};

const RoomInspectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    activity: Activity;
    turnId: string;
    assemblyId: string;
    onInspectionSuccess: (xpEarned: number) => void;
}> = ({ isOpen, onClose, activity, turnId, assemblyId, onInspectionSuccess }) => {
    const [status, setStatus] = useState<'OK' | 'ISSUES'>('OK');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const recordFn = httpsCallable<any, { success: boolean; xpEarned: number }>(functions, 'recordRoomInspection');
            const res = await recordFn({
                assemblyId,
                turnId,
                roomId: activity.id,
                roomName: activity.name,
                status,
                notes
            });
            onInspectionSuccess(res.data.xpEarned);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Errore durante l\'invio del rapporto.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Rapporto Ispezione</span>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-tight">
                                {activity.name}
                            </h3>
                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{activity.location_name} • Turno {turnId}</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
                            <X className="w-5 h-5 group-hover:rotate-90 transition-transform text-white/40 group-hover:text-white" />
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl uppercase tracking-wider">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Stato dell'Aula</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setStatus('OK')}
                                className={`p-5 rounded-2xl border transition-all text-left flex flex-col gap-2 ${
                                    status === 'OK' 
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                        : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white'
                                }`}
                            >
                                <span className="text-xl">🟢</span>
                                <span className="text-xs font-black uppercase tracking-widest">Tutto Regolare</span>
                                <span className="text-[8.5px] font-medium opacity-50 uppercase tracking-wider leading-relaxed">Presenze e comportamento conformi.</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus('ISSUES')}
                                className={`p-5 rounded-2xl border transition-all text-left flex flex-col gap-2 ${
                                    status === 'ISSUES' 
                                        ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                                        : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white'
                                }`}
                            >
                                <span className="text-xl">🔴</span>
                                <span className="text-xs font-black uppercase tracking-widest">Irregolarità</span>
                                <span className="text-[8.5px] font-medium opacity-50 uppercase tracking-wider leading-relaxed">Troppi imbucati o altri problemi rilevati.</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/30">Note e Dettagli (Opzionale)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Descrivi la situazione o specifica le problematiche riscontrate..."
                            maxLength={300}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-amber-500/50 focus:bg-amber-500/5 transition-all resize-none"
                        />
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-[2rem] flex gap-4 items-start">
                        <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Ricompensa Attività</p>
                            <p className="text-[9px] font-bold text-amber-500/60 leading-relaxed uppercase">
                                Riceverai +20 XP per la prima ispezione di quest'aula in questo turno.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white/60"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/20 disabled:text-amber-500/40 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    Invia Rapporto
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const SecurityDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { assemblyId, turnId } = useParams();
    const { user, userProfile } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [activeAssembly, setActiveAssembly] = useState<Assembly | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTurn, setSelectedTurn] = useState<string>(turnId || "1");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [inspectingActivity, setInspectingActivity] = useState<Activity | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

    // Staff Check-in Logic
    const [staffStudentDoc, setStaffStudentDoc] = useState<any>(null);
    const [isStaffCheckingIn, setIsStaffCheckingIn] = useState(false);

    useEffect(() => {
        if (!user?.email || !assemblyId) {
            setStaffStudentDoc(null);
            return;
        }

        const studentDocId = `${assemblyId}_${user.email.toLowerCase().trim()}`;
        const studentRef = doc(db, 'students', studentDocId);

        const unsubscribeStaff = onSnapshot(studentRef, (snap) => {
            if (snap.exists()) {
                setStaffStudentDoc(snap.data());
            } else {
                setStaffStudentDoc(null);
            }
        });

        return () => unsubscribeStaff();
    }, [user?.email, assemblyId]);

    const isStaffCheckedIn = staffStudentDoc && staffStudentDoc.staff_actual_location && Object.values(staffStudentDoc.staff_actual_location).some((loc: any) => loc?.checked_in);

    const toggleStaffCheckIn = async () => {
        if (!user?.email || !assemblyId || !activeAssembly || isStaffCheckingIn) return;
        setIsStaffCheckingIn(true);
        try {
            const cleanEmail = user.email.toLowerCase().trim();
            const studentDocId = `${assemblyId}_${cleanEmail}`;
            const studentRef = doc(db, 'students', studentDocId);

            const turnsList = activeAssembly.turn_ids || ['T1', 'T2', 'T3'];

            if (isStaffCheckedIn) {
                // Check out
                const actualLocationUpdate: Record<string, any> = {};
                turnsList.forEach(tId => {
                    const cleanId = tId.replace('T', '');
                    const legacyId = `T${cleanId}`;
                    actualLocationUpdate[`staff_actual_location.${cleanId}`] = deleteField();
                    actualLocationUpdate[`staff_actual_location.${legacyId}`] = deleteField();
                });
                await updateDoc(studentRef, actualLocationUpdate);
                setNotification({
                    message: "Presenza staff cancellata",
                    type: 'info'
                });
                setTimeout(() => setNotification(null), 3000);
            } else {
                // Check in
                const actualLocationUpdate: Record<string, any> = {};
                turnsList.forEach(tId => {
                    const cleanId = tId.replace('T', '');
                    const legacyId = `T${cleanId}`;
                    const checkinData = {
                        activity_id: 'STAFF',
                        checked_in: true,
                        timestamp: serverTimestamp(),
                        markedBy: 'Self (Security Page)',
                        markedAt: new Date().toISOString()
                    };
                    actualLocationUpdate[`staff_actual_location.${cleanId}`] = checkinData;
                    actualLocationUpdate[`staff_actual_location.${legacyId}`] = checkinData;
                });

                if (!staffStudentDoc) {
                    await setDoc(studentRef, {
                        id: studentDocId,
                        firstName: userProfile?.displayName?.split(' ')[0] || '',
                        lastName: userProfile?.displayName?.split(' ').slice(1).join(' ') || '',
                        email: cleanEmail,
                        assemblyId,
                        scheduled_turns: {},
                        actual_location: {},
                        staff_actual_location: {}
                    });
                }
                await updateDoc(studentRef, actualLocationUpdate);
                setNotification({
                    message: "Presenza staff registrata!",
                    type: 'success'
                });
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (err) {
            console.error("Staff check-in toggle failed:", err);
            setNotification({
                message: "Errore salvataggio presenza",
                type: 'info'
            });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsStaffCheckingIn(false);
        }
    };

    // Global Student Search Logic
    const [globalSearchText, setGlobalSearchText] = useState("");
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);
    const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
    const [globalSearchResults, setGlobalSearchResults] = useState<Student[]>([]);
    const [selectedStudentForSchedule, setSelectedStudentForSchedule] = useState<Student | null>(null);

    useEffect(() => {
        const activeRef = { current: true };
        const term = globalSearchText.trim();
        if (term.length < 3) {
            setGlobalSearchResults([]);
            setGlobalSearchLoading(false);
            return;
        }

        const timer = setTimeout(async () => {
            setGlobalSearchLoading(true);
            try {
                const searchUsersFn = httpsCallable(functions, 'searchUsers');
                const res = await searchUsersFn({ queryText: term });
                if (!activeRef.current) return;
                const users = res.data as any[];

                const docsPromises = users.map(async (u: any) => {
                    const studentId = `${assemblyId}_${u.email.toLowerCase().trim()}`;
                    const docSnap = await getDoc(doc(db, "students", studentId));
                    if (docSnap.exists()) {
                        return { id: docSnap.id, ...docSnap.data() } as Student;
                    }
                    return null;
                });
                const foundStudents = (await Promise.all(docsPromises)).filter(Boolean) as Student[];
                setGlobalSearchResults(foundStudents);
            } catch (err) {
                console.error("Error searching students in SecurityDashboard:", err);
            } finally {
                if (activeRef.current) setGlobalSearchLoading(false);
            }
        }, 500);

        return () => {
            activeRef.current = false;
            clearTimeout(timer);
        };
    }, [globalSearchText, assemblyId]);

    // Identify all possible turns from the activities
    const availableTurns = Array.from(new Set(activities.flatMap(a => a.turn_ids || []))).sort();

    useEffect(() => {
        if (!assemblyId) return;

        // Fetch Assembly Details
        const assemblyRef = doc(db, "assemblies", assemblyId);
        const unsubscribeAssembly = onSnapshot(assemblyRef, (docSnap) => {
            if (docSnap.exists()) {
                setActiveAssembly({ id: docSnap.id, ...docSnap.data() } as Assembly);
            }
        });

        // Fetch Activities for this assembly
        const qRooms = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
        const unsubscribeRooms = onSnapshot(qRooms, (snapshot) => {
            const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Activity));
            setActivities(list);
            setLoading(false);
        });

        return () => {
            unsubscribeAssembly();
            unsubscribeRooms();
        };
    }, [assemblyId]);

    // Handle turn changes via URL if needed
    useEffect(() => {
        if (turnId && turnId !== selectedTurn) {
            setSelectedTurn(turnId);
        }
    }, [turnId, selectedTurn]);

    // Auto-redirect if invalid turnId
    useEffect(() => {
        if (availableTurns.length > 0) {
            const isCurrentTurnValid = availableTurns.includes(selectedTurn);
            const isUrlTurnUndefined = turnId === 'undefined';
            
            if (!isCurrentTurnValid || isUrlTurnUndefined) {
                const targetTurn = availableTurns.includes('1') ? '1' : availableTurns[0];
                console.warn(`[SecurityDashboard] Invalid turn "${selectedTurn}". Redirecting to "${targetTurn}"`);
                setSelectedTurn(targetTurn);
                navigate(`/security/${assemblyId}/${targetTurn}`, { replace: true });
            }
        }
    }, [availableTurns, selectedTurn, turnId, navigate, assemblyId]);

    const handleTurnChange = (newTurn: string) => {
        setSelectedTurn(newTurn);
        navigate(`/security/${assemblyId}/${newTurn}`, { replace: true });
    };

    const filteredActivities = activities
        .filter(a => (a.turn_ids || []).includes(selectedTurn))
        .filter(a =>
            (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.location_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            // Sort by saturation (descending) so full rooms appear first
            const countA = a.counts_by_turn?.[selectedTurn] || 0;
            const countB = b.counts_by_turn?.[selectedTurn] || 0;
            const satA = countA / (a.max_capacity || 1);
            const satB = countB / (b.max_capacity || 1);
            return satB - satA;
        });


    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
    );

    return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col bg-surface overflow-x-hidden selection:bg-amber-500/30">
            {/* Sticky Header */}
            <header className="sticky top-0 z-30 bg-surface/60 backdrop-blur-2xl border-b border-white/[0.05] p-5 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate("/staff")}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Staff</span>
                    </button>
                    <div className="px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        Sicurezza Attiva
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-[0.9] text-white mb-2">
                        Monitoraggio<br />
                        <span className="text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">Sicurezza</span>
                    </h1>
                    <div className="flex items-center gap-2 text-white/40 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                        <Building2 className="w-4 h-4 text-amber-500/50" />
                        <span className="break-words max-w-[200px]">{activeAssembly?.name}</span>
                    </div>
                </div>

                {userProfile && (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3 relative overflow-hidden group/stats">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.02] to-transparent pointer-events-none" />
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-amber-500/60">Agente di Sicurezza</p>
                                <p className="text-sm font-black uppercase text-white truncate max-w-[180px]">{userProfile.displayName || 'Security Patrol'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black uppercase tracking-widest text-amber-500/60">XP Sicurezza</p>
                                <p className="text-sm font-black text-amber-500">+{ (userProfile.securityInspections || 0) * 20 } XP</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 relative z-10">
                            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                                <p className="text-[7px] font-black uppercase tracking-widest text-white/30">Ispezioni Aule</p>
                                <p className="text-lg font-black text-white">{userProfile.securityInspections || 0}</p>
                            </div>
                            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                                <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest text-white/30">
                                    <span>Badge 🛡️</span>
                                    <span>{userProfile.securityInspections || 0} / 5</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-px mt-1.5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, ((userProfile.securityInspections || 0) / 5) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/5 flex flex-col gap-2 relative z-10">
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/60">Presenza Servizio</span>
                                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                    isStaffCheckedIn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25' : 'bg-white/5 text-white/40 border border-white/5'
                                }`}>
                                    {isStaffCheckedIn ? 'PRESENTE' : 'ASSENTE'}
                                </span>
                            </div>
                            <button
                                onClick={toggleStaffCheckIn}
                                disabled={isStaffCheckingIn}
                                className={`w-full py-2.5 text-black font-black uppercase text-[8px] tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:grayscale ${
                                    isStaffCheckedIn ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                }`}
                            >
                                {isStaffCheckingIn ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isStaffCheckedIn ? (
                                    'Cancella Presenza Servizio'
                                ) : (
                                    'Registra Presenza Servizio'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Turn Switcher Sub-Header */}
                {availableTurns.length > 0 && (
                    <div className="pt-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3 px-1">Filtra per Turno</p>
                        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                            {availableTurns.map(t => (
                                <button
                                    key={t}
                                    onClick={() => handleTurnChange(t)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${selectedTurn === t
                                        ? 'bg-amber-500 text-black border-transparent shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    Turno {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs / Search Toggles */}
                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cerca Attività o Aula..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-amber-500/50 focus:bg-amber-500/5 transition-all font-medium text-sm"
                        />
                    </div>
                    <div className="relative group">
                        <button 
                            onClick={() => setIsGlobalSearching(!isGlobalSearching)}
                            className={`p-4 rounded-2xl border-2 transition-all ${isGlobalSearching ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-white/5 border-white/5 text-white/40 hover:text-white'}`}
                        >
                            <Calendar className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Global Student Search Overlay */}
                {isGlobalSearching && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="relative">
                            {globalSearchLoading ? (
                                <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />
                            ) : (
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60" />
                            )}
                            <input
                                autoFocus
                                type="text"
                                placeholder="Lookup Studente (Nome o Email)..."
                                value={globalSearchText}
                                onChange={(e) => setGlobalSearchText(e.target.value)}
                                className="w-full bg-amber-500/5 border-2 border-amber-500/20 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-amber-500/50 transition-all font-bold text-sm text-amber-500 placeholder:text-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.05)]"
                            />
                        </div>
                        
                        {globalSearchLoading ? (
                            <div className="p-4 text-center text-white/30 text-xs font-bold uppercase tracking-widest bg-white/[0.01] border border-white/5 rounded-2xl">
                                <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                                Ricerca in corso...
                            </div>
                        ) : globalSearchResults.length > 0 ? (
                            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                {globalSearchResults.map(s => (
                                    <button 
                                        key={s.id}
                                        onClick={() => {
                                            setSelectedStudentForSchedule(s);
                                            setIsGlobalSearching(false);
                                            setGlobalSearchText("");
                                        }}
                                        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <div className="text-left">
                                            <p className="font-black text-xs uppercase text-white">{s.lastName} {s.firstName}</p>
                                            <p className="text-[10px] font-bold text-white/20">{s.email}</p>
                                        </div>
                                        <ArrowLeft className="w-4 h-4 text-amber-500 rotate-180" />
                                    </button>
                                ))}
                            </div>
                        ) : globalSearchText.trim().length >= 3 ? (
                            <div className="p-4 text-center text-white/20 text-xs font-bold uppercase tracking-widest bg-white/[0.01] border border-white/5 rounded-2xl">
                                Nessun match trovato per "{globalSearchText}"
                            </div>
                        ) : null}
                    </div>
                )}
            </header>

            <main className="flex-1 p-6 space-y-4 pb-32">
                {filteredActivities.length === 0 ? (
                    <div className="py-20 text-center opacity-30">
                        <Shield className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nessuna attività trovata</p>
                    </div>
                ) : (
                    filteredActivities.map(activity => {
                        const count = activity.counts_by_turn?.[selectedTurn] || 0;
                        const max = activity.max_capacity || 0;
                        const isFull = count >= max;
                        const percentage = max > 0 ? (count / max) * 100 : 0;

                        return (
                            <div
                                key={activity.id}
                                onClick={() => setSelectedActivity(activity)}
                                className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col cursor-pointer hover:bg-white/[0.04] active:scale-[0.98] group ${isFull
                                    ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex-1 pr-2">
                                        <h3 className="font-black text-base md:text-lg uppercase leading-tight mb-2 tracking-tight break-words group-hover:text-amber-500 transition-colors">
                                            {activity.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full border border-white/5 break-words max-w-full">
                                                {activity.location_name}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl border ${isFull
                                        ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                        : 'bg-black/40 border-white/10 text-white group-hover:border-amber-500/40 group-hover:text-amber-500 transition-colors'
                                        }`}>
                                        <span className="text-xl font-black italic leading-none">{count}</span>
                                        <span className="text-[9px] font-bold opacity-50 mt-1">/ {max}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 relative z-10">
                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-1.5">
                                            {isFull ? (
                                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                            ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                                            )}
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isFull ? 'text-red-500' : 'text-amber-500'
                                                }`}>
                                                {isFull ? 'Capienza Massima' : 'Regolare'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/30">{Math.round(percentage)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                                }`}
                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                        />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setInspectingActivity(activity);
                                        }}
                                        className="mt-4 w-full py-3 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/20 hover:border-transparent rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Shield className="w-3.5 h-3.5" />
                                        Registra Ispezione
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Notification Banner */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] w-full max-w-sm px-4 animate-in slide-in-from-top-10 duration-300">
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-2xl ${
                        notification.type === 'success' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]'
                    }`}>
                        {notification.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <Shield className="w-5 h-5 shrink-0" />}
                        <p className="text-xs font-black uppercase tracking-wider">{notification.message}</p>
                    </div>
                </div>
            )}

            {/* Modals */}
            {selectedActivity && (
                <StudentListModal 
                    isOpen={!!selectedActivity}
                    onClose={() => setSelectedActivity(null)}
                    activity={selectedActivity}
                    turnId={selectedTurn}
                />
            )}

            {selectedStudentForSchedule && (
                <StudentScheduleModal
                    isOpen={!!selectedStudentForSchedule}
                    onClose={() => setSelectedStudentForSchedule(null)}
                    student={selectedStudentForSchedule}
                    currentTurn={selectedTurn}
                />
            )}

            {inspectingActivity && (
                <RoomInspectionModal
                    isOpen={!!inspectingActivity}
                    onClose={() => setInspectingActivity(null)}
                    activity={inspectingActivity}
                    turnId={selectedTurn}
                    assemblyId={assemblyId || ''}
                    onInspectionSuccess={(xpEarned) => {
                        if (xpEarned > 0) {
                            setNotification({
                                message: `Ispezione registrata! +${xpEarned} XP 🛡️`,
                                type: 'success'
                            });
                        } else {
                            setNotification({
                                message: `Rapporto ispezione salvato!`,
                                type: 'info'
                            });
                        }
                        setTimeout(() => setNotification(null), 3000);
                    }}
                />
            )}
        </div>
    );
};
