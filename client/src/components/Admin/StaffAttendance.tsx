import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteField, where, getDocs, serverTimestamp, getDoc } from "firebase/firestore";
import type { Assembly, AssemblyRole, Student } from '../../types';
import { ShieldCheck, Shield, Key, Loader2, UserCheck, Users, CheckCircle2, XCircle, Search } from "lucide-react";
import { useAuth } from '../../hooks/useAuth';
import { logAudit } from "../../utils/auditLogger";

interface StaffAttendanceProps {
    assemblyId: string;
}

interface AdminEntry {
    email: string;
    role: 'ADMIN' | 'SVILUPPATORE';
}

type StaffMember = {
    email: string;
    role: 'ADMIN' | 'SVILUPPATORE' | 'SECURITY' | 'ROOM_MANAGER';
    label: string;
    activityName?: string;
};

export const StaffAttendance: React.FC<StaffAttendanceProps> = ({ assemblyId }) => {
    const { userProfile } = useAuth();

    const [admins, setAdmins] = useState<AdminEntry[]>([]);
    const [assemblyRoles, setAssemblyRoles] = useState<AssemblyRole[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [assembly, setAssembly] = useState<Assembly | null>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [isUpdatingCheckIn, setIsUpdatingCheckIn] = useState<Record<string, boolean>>({});
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStaffStudents = React.useCallback(async (emails: string[]) => {
        if (emails.length === 0) {
            setStudents([]);
            return;
        }
        setIsRefreshing(true);
        try {
            const promises = emails.map(async (email) => {
                const docId = `${assemblyId}_${email.toLowerCase().trim()}`;
                const snap = await getDoc(doc(db, "students", docId));
                if (snap.exists()) {
                    return { id: snap.id, ...snap.data() } as Student;
                }
                return null;
            });
            const results = (await Promise.all(promises)).filter(Boolean) as Student[];
            setStudents(results);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Error fetching staff students statically:", error);
        } finally {
            setIsRefreshing(false);
        }
    }, [assemblyId]);

    useEffect(() => {
        const qA = query(collection(db, "admins"));
        const unsubA = onSnapshot(qA, (snap) => setAdmins(snap.docs.map(d => d.data() as AdminEntry)));

        const qR = query(collection(db, "assembly_roles"), where("assemblyId", "==", assemblyId));
        const unsubR = onSnapshot(qR, (snap) => setAssemblyRoles(snap.docs.map(d => d.data() as AssemblyRole)));

        const unsubAsm = onSnapshot(doc(db, "assemblies", assemblyId), (snap) => {
            if (snap.exists()) setAssembly({ id: snap.id, ...snap.data() } as Assembly);
        });

        const qAct = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
        const unsubAct = onSnapshot(qAct, (snap) => setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => { unsubA(); unsubR(); unsubAsm(); unsubAct(); };
    }, [assemblyId]);

    // Build unified staff list
    const staffList = useMemo<StaffMember[]>(() => {
        const list: StaffMember[] = [];
        const seen = new Set<string>();

        admins.forEach(a => {
            const e = a.email.toLowerCase().trim();
            if (!seen.has(e)) {
                seen.add(e);
                list.push({ email: e, role: a.role, label: a.role === 'SVILUPPATORE' ? 'Sviluppatore' : 'Admin' });
            }
        });

        assemblyRoles.forEach(r => {
            const e = r.email.toLowerCase().trim();
            if (!seen.has(e)) {
                seen.add(e);
                const act = activities.find(a => a.id === r.activityId);
                list.push({
                    email: e,
                    role: r.role as any,
                    label: r.role === 'ROOM_MANAGER' ? 'Room Manager' : 'Security',
                    activityName: act?.name
                });
            } else {
                // If an admin also has an assembly role, update their role info
                const existing = list.find(l => l.email === e);
                if (existing && (existing.role === 'ADMIN' || existing.role === 'SVILUPPATORE')) {
                    const act = activities.find(a => a.id === r.activityId);
                    existing.label += ` + ${r.role === 'ROOM_MANAGER' ? 'Room Manager' : 'Security'}`;
                    if (act) existing.activityName = act.name;
                }
            }
        });

        return list;
    }, [admins, assemblyRoles, activities]);

    // Re-fetch when staff list changes
    useEffect(() => {
        const emails = staffList.map(s => s.email);
        fetchStaffStudents(emails);
    }, [staffList, fetchStaffStudents]);

    const isStaffCheckedIn = (email: string): boolean => {
        const clean = email.toLowerCase().trim();
        const student = students.find(s => s.email.toLowerCase() === clean);
        return !!(student && student.staff_actual_location && Object.values(student.staff_actual_location).some((loc: any) => loc?.checked_in));
    };

    const checkedInCount = useMemo(() => staffList.filter(s => isStaffCheckedIn(s.email)).length, [staffList, students]);

    const filteredStaff = useMemo(() => {
        if (!searchQuery.trim()) return staffList;
        const q = searchQuery.toLowerCase();
        return staffList.filter(s => s.email.includes(q) || s.label.toLowerCase().includes(q) || (s.activityName || '').toLowerCase().includes(q));
    }, [staffList, searchQuery]);

    const handleToggleCheckIn = async (email: string) => {
        const cleanEmail = email.toLowerCase().trim();
        setIsUpdatingCheckIn(prev => ({ ...prev, [cleanEmail]: true }));
        try {
            const studentDocId = `${assemblyId}_${cleanEmail}`;
            const studentRef = doc(db, 'students', studentDocId);
            const turnsList = assembly?.turn_ids || ['T1', 'T2', 'T3'];

            const existingStudent = students.find(s => s.email.toLowerCase() === cleanEmail);
            const isCheckedIn = isStaffCheckedIn(cleanEmail);

            if (isCheckedIn) {
                const actualLocationUpdate: Record<string, any> = {};
                turnsList.forEach(tId => {
                    const cleanId = tId.replace('T', '');
                    const legacyId = `T${cleanId}`;
                    actualLocationUpdate[`staff_actual_location.${cleanId}`] = deleteField();
                    actualLocationUpdate[`staff_actual_location.${legacyId}`] = deleteField();
                });
                await updateDoc(studentRef, actualLocationUpdate);
                await logAudit('STAFF_CHECKOUT', userProfile?.email || 'System', `Registrata assenza staff per: ${cleanEmail}`, assemblyId);
            } else {
                let firstName = "";
                let lastName = "";

                if (existingStudent) {
                    firstName = existingStudent.firstName;
                    lastName = existingStudent.lastName;
                } else {
                    const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", cleanEmail)));
                    if (!usersSnap.empty) {
                        const uData = usersSnap.docs[0].data();
                        const displayName = uData.displayName || "";
                        firstName = displayName.split(' ')[0] || "";
                        lastName = displayName.split(' ').slice(1).join(' ') || "";
                    }
                    if (!firstName) {
                        const prefix = cleanEmail.split('@')[0];
                        const parts = prefix.split('.');
                        firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                        lastName = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || "Staff";
                    }
                }

                const actualLocationUpdate: Record<string, any> = {};
                turnsList.forEach(tId => {
                    const cleanId = tId.replace('T', '');
                    const legacyId = `T${cleanId}`;
                    const checkinData = {
                        activity_id: 'STAFF',
                        checked_in: true,
                        timestamp: serverTimestamp(),
                        markedBy: `Admin (${userProfile?.email || 'System'})`,
                        markedAt: new Date().toISOString()
                    };
                    actualLocationUpdate[`staff_actual_location.${cleanId}`] = checkinData;
                    actualLocationUpdate[`staff_actual_location.${legacyId}`] = checkinData;
                });

                if (!existingStudent) {
                    await setDoc(studentRef, {
                        id: studentDocId,
                        firstName,
                        lastName,
                        email: cleanEmail,
                        assemblyId,
                        scheduled_turns: {},
                        actual_location: {},
                        staff_actual_location: {}
                    });
                }
                await updateDoc(studentRef, actualLocationUpdate);
                await logAudit('STAFF_CHECKIN', userProfile?.email || 'System', `Registrata presenza staff per: ${cleanEmail}`, assemblyId);
            }
            // Re-fetch staff student documents to immediately update UI state
            await fetchStaffStudents(staffList.map(s => s.email));
        } catch (error) {
            console.error("Error toggling staff check-in:", error);
        } finally {
            setIsUpdatingCheckIn(prev => ({ ...prev, [cleanEmail]: false }));
        }
    };

    const handleBulkCheckInAll = async () => {
        const notCheckedIn = staffList.filter(s => !isStaffCheckedIn(s.email));
        if (notCheckedIn.length === 0) return;
        setIsBulkUpdating(true);
        try {
            for (const member of notCheckedIn) {
                await handleToggleCheckIn(member.email);
            }
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'SVILUPPATORE':
            case 'ADMIN':
                return <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />;
            case 'SECURITY':
                return <Shield className="w-5 h-5 md:w-6 md:h-6" />;
            case 'ROOM_MANAGER':
                return <Key className="w-5 h-5 md:w-6 md:h-6" />;
            default:
                return <Users className="w-5 h-5 md:w-6 md:h-6" />;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'SVILUPPATORE': return { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', shadow: 'shadow-primary/10' };
            case 'ADMIN': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', shadow: 'shadow-blue-500/10' };
            case 'SECURITY': return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', shadow: 'shadow-amber-500/10' };
            case 'ROOM_MANAGER': return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', shadow: 'shadow-purple-500/10' };
            default: return { bg: 'bg-white/10', text: 'text-white/60', border: 'border-white/10', shadow: '' };
        }
    };

    return (
        <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-8">
                {/* Header & Summary */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
                    <div>
                        <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Pannello Presenze Staff
                        </div>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mt-1">Check-in Staff</h2>
                        <p className="text-[10px] text-white/40 mt-1 font-medium">
                            Segna la presenza di tutti i membri dello staff per questa assemblea.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-center">
                        {lastUpdated && (
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                                Dati: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={() => fetchStaffStudents(staffList.map(s => s.email))}
                            disabled={isRefreshing}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white/60 hover:text-white transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
                            title="Aggiorna presenze staff"
                        >
                            <Loader2 className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Aggiorna</span>
                        </button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-lg font-black">{checkedInCount}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Presenti</p>
                        </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-lg font-black">{staffList.length - checkedInCount}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Assenti</p>
                        </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-lg font-black">{staffList.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Totale Staff</p>
                        </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${staffList.length > 0 && checkedInCount === staffList.length ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-white/5 border border-white/10 text-white/20'}`}>
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-lg font-black">{staffList.length > 0 ? Math.round((checkedInCount / staffList.length) * 100) : 0}%</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Copertura</p>
                        </div>
                    </div>
                </div>

                {/* Search + Bulk Action */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cerca nello staff..."
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-emerald-500/30 transition-all text-sm font-medium placeholder:text-white/20"
                        />
                    </div>
                    {staffList.length - checkedInCount > 0 && (
                        <button
                            onClick={handleBulkCheckInAll}
                            disabled={isBulkUpdating}
                            className="px-5 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 btn-press disabled:opacity-40"
                        >
                            {isBulkUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <UserCheck className="w-4 h-4" />
                                    Segna Tutti Presenti ({staffList.length - checkedInCount})
                                </>
                            )}
                        </button>
                    )}
                    {staffList.length > 0 && checkedInCount === staffList.length && (
                        <div className="px-5 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            Tutti Presenti
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {staffList.length > 0 && (
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${(checkedInCount / staffList.length) * 100}%` }}
                        />
                    </div>
                )}

                {/* Staff List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredStaff.map(member => {
                        const isCheckedIn = isStaffCheckedIn(member.email);
                        const isUpdating = isUpdatingCheckIn[member.email];
                        const colors = getRoleColor(member.role);

                        return (
                            <div
                                key={member.email}
                                className={`bg-white/[0.02] border rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 flex justify-between items-center group hover:bg-white/[0.05] transition-all duration-300 relative overflow-hidden ${
                                    isCheckedIn ? 'border-emerald-500/15' : 'border-white/5'
                                }`}
                            >
                                {/* Checked-in accent */}
                                {isCheckedIn && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 transition-all" />
                                )}

                                <div className="flex items-center gap-4 md:gap-5 min-w-0">
                                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 border ${colors.bg} ${colors.text} ${colors.border}`}>
                                        {getRoleIcon(member.role)}
                                    </div>
                                    <div className="min-w-0 pr-2">
                                        <p className="font-black text-sm md:text-base leading-tight mb-1.5 break-all">{member.email}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[4px] border ${colors.text} ${colors.border} ${colors.bg}`}>
                                                {member.label}
                                            </span>
                                            {member.activityName && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                                    <p className="text-[9px] font-bold text-white/40 uppercase leading-none">
                                                        {member.activityName}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleToggleCheckIn(member.email)}
                                    disabled={isUpdating}
                                    className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border btn-press ${
                                        isCheckedIn
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                            : 'bg-white/5 border-white/5 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                    }`}
                                >
                                    {isUpdating ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : isCheckedIn ? (
                                        <>
                                            <ShieldCheck className="w-3.5 h-3.5" /> Presente
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck className="w-3.5 h-3.5" /> Segna Presente
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}

                    {filteredStaff.length === 0 && staffList.length > 0 && (
                        <div className="md:col-span-2 py-16 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-black/10">
                            <Search className="w-10 h-10 text-white/5 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">Nessun risultato per "{searchQuery}"</p>
                        </div>
                    )}

                    {staffList.length === 0 && (
                        <div className="md:col-span-2 py-20 md:py-24 text-center border-2 border-dashed border-white/5 rounded-[2rem] md:rounded-[2.5rem] bg-black/10">
                            <Users className="w-12 h-12 text-white/5 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">
                                Nessuno staff configurato
                            </p>
                            <p className="text-[9px] text-white/5 mt-2 uppercase tracking-wider font-bold">
                                Configura i ruoli nel tab "Ruoli & Deleghe"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
