import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, where } from "firebase/firestore";
import type { Activity, AssemblyRole } from '../../types';
import { Shield, Trash2, Mail, Star, Loader2, Key, ShieldCheck, Search, Users } from "lucide-react";
import { useAuth } from '../../hooks/useAuth';
import { logAudit } from "../../utils/auditLogger";

interface RoleManagerProps {
    assemblyId: string;
}

interface AdminEntry {
    email: string;
    role: 'ADMIN' | 'SVILUPPATORE';
}

export const RoleManager: React.FC<RoleManagerProps> = ({ assemblyId }) => {
    const { userProfile } = useAuth();
    // Global Admins
    const [admins, setAdmins] = useState<AdminEntry[]>([]);

    // Assembly-specific Roles
    const [assemblyRoles, setAssemblyRoles] = useState<AssemblyRole[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);

    // Form State
    const [email, setEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState<'SECURITY' | 'ROOM_MANAGER'>('SECURITY');
    const [selectedActivityId, setSelectedActivityId] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    useEffect(() => {
        // 1. Fetch Global Admins
        const qA = query(collection(db, "admins"));
        const unsubscribeA = onSnapshot(qA, (snapshot) => {
            setAdmins(snapshot.docs.map(doc => doc.data() as AdminEntry));
        }, (error) => {
            console.error("[RoleManager] Global admins listener error:", error);
        });

        // 2. Fetch Assembly Roles
        const qR = query(collection(db, "assembly_roles"), where("assemblyId", "==", assemblyId));
        const unsubscribeR = onSnapshot(qR, (snapshot) => {
            setAssemblyRoles(snapshot.docs.map(doc => doc.data() as AssemblyRole));
        }, (error) => {
            console.error("[RoleManager] Assembly roles listener error:", error);
        });

        // 3. Fetch Activities for Dropdown
        const qAct = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
        const unsubscribeAct = onSnapshot(qAct, (snapshot) => {
            setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
        }, (error) => {
            console.error("[RoleManager] Rooms listener error:", error);
        });

        return () => {
            unsubscribeA();
            unsubscribeR();
            unsubscribeAct();
        };
    }, [assemblyId]);

    const handleAssignStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsSaving(true);

        const cleanEmail = email.toLowerCase().trim();
        const roleId = `${assemblyId}_${cleanEmail.replace(/[.@]/g, '_')}`;

        try {
            const roleData: any = {
                id: roleId,
                assemblyId,
                email: cleanEmail,
                role: selectedRole,
                assignedAt: Date.now()
            };

            if (selectedRole === 'ROOM_MANAGER' && selectedActivityId) {
                roleData.activityId = selectedActivityId;
            }

            await setDoc(doc(db, "assembly_roles", roleId), roleData);
            const activity = activities.find(a => a.id === selectedActivityId);
            const details = selectedRole === 'ROOM_MANAGER'
                ? `Assegnato ruolo ROOM_MANAGER a ${cleanEmail} per l'attività: ${activity?.name || 'N/D'}`
                : `Assegnato ruolo SECURITY a ${cleanEmail}`;

            await logAudit('ROLE_ASSIGNED', userProfile?.email || 'System', details, assemblyId);

            setEmail("");
            setSelectedActivityId("");
        } catch (error) {
            console.error("Error assigning staff role:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveRole = async (roleId: string) => {
        const role = assemblyRoles.find(r => r.id === roleId);
        try {
            await deleteDoc(doc(db, "assembly_roles", roleId));
            if (role) {
                await logAudit('ROLE_REMOVED', userProfile?.email || 'System', `Rimosso ruolo ${role.role} per l'utente: ${role.email}`, assemblyId);
            }
            setConfirmRemoveId(null);
        } catch (error) {
            console.error("Error removing role:", error);
        }
    };



    return (
        <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-12 md:space-y-16">
                {/* AMMINISTRATORI GLOBALI */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-widest italic">Amministratori Globali</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {admins.map(admin => {
                            return (
                                <div key={admin.email} className="bg-white/[0.03] border border-white/5 p-5 rounded-[1.5rem] md:rounded-3xl flex justify-between items-center group transition-all hover:bg-white/[0.05]">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${admin.role === 'SVILUPPATORE' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-white/10 text-white/40'}`}>
                                            {admin.role === 'SVILUPPATORE' ? <Star className="w-5 h-5 md:w-6 md:h-6" /> : <Shield className="w-5 h-5 md:w-6 md:h-6" />}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="font-bold text-sm md:text-base break-all leading-tight mb-0.5">{admin.email}</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                                                {admin.role === 'SVILUPPATORE' ? 'AMMINISTRATORE SVILUPPATORE' : admin.role}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent w-full" />

                {/* STAFF ASSEMBLEA (LOCAL) */}
                <section className="space-y-8 pb-12">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-primary" />
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-widest italic">Staff Autorizzato</h2>
                        </div>
                    </div>

                    {/* Form di Assegnazione */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 md:p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6 relative z-10">Nuova Autorizzazione</h3>
                        <form onSubmit={handleAssignStaff} className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                            <div className="md:col-span-2 relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-bold text-sm"
                                    placeholder="Email Collaboratore"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <select
                                    className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-4 px-4 outline-none focus:border-primary/50 transition-all font-bold text-sm cursor-pointer appearance-none"
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value as any)}
                                >
                                    <option value="SECURITY">Security</option>
                                    <option value="ROOM_MANAGER">Room Manager</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving || !email || (selectedRole === 'ROOM_MANAGER' && !selectedActivityId)}
                                className="bg-primary text-black py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-20 disabled:grayscale"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Autorizza Accesso"}
                            </button>

                            {selectedRole === 'ROOM_MANAGER' && (
                                <div className="md:col-span-4 mt-2 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2 mb-2 block">Assegna Attività da Gestire</label>
                                    <div className="relative">
                                        <select
                                            required
                                            className="w-full bg-black/40 border-2 border-white/10 rounded-xl py-4 px-4 outline-none focus:border-primary/50 transition-all font-bold text-sm italic appearance-none cursor-pointer"
                                            value={selectedActivityId}
                                            onChange={e => setSelectedActivityId(e.target.value)}
                                        >
                                            <option value="">- Seleziona Attività -</option>
                                            {activities.map(act => (
                                                <option key={act.id} value={act.id}>{act.name} (Aula: {act.location_name})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Lista Staff */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assemblyRoles.map(role => {
                            const assignedActivity = activities.find(a => a.id === role.activityId);

                            return (
                                <div key={role.id} className="bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex justify-between items-center group hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 relative">
                                    <div className="flex items-center gap-4 md:gap-5 min-w-0">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 ${role.role === 'SECURITY' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                                            {role.role === 'SECURITY' ? <Shield className="w-6 h-6 md:w-7 md:h-7" /> : <Key className="w-6 h-6 md:w-7 md:h-7" />}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="font-black text-base md:text-lg leading-tight mb-1.5 break-all">{role.email}</p>
                                            <div className="flex items-center gap-2">
                                                <p className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[4px] border ${role.role === 'SECURITY' ? 'text-amber-500/80 border-amber-500/20 bg-amber-500/5' : 'text-primary border-primary/20 bg-primary/5'}`}>
                                                    {role.role.replace('_', ' ')}
                                                </p>
                                                {role.role === 'ROOM_MANAGER' && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                                        <p className="text-[9px] font-bold text-white/40 uppercase leading-none">
                                                            {assignedActivity?.name || 'Attività rimossa'}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 relative z-10">
                                        {confirmRemoveId === role.id ? (
                                            <div className="flex items-center gap-1.5 bg-black/40 border border-red-500/20 p-1.5 rounded-xl animate-in fade-in slide-in-from-right-2 duration-300 shrink-0">
                                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest px-1">Rimuovere?</span>
                                                <button
                                                    onClick={() => handleRemoveRole(role.id)}
                                                    className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-[8px] font-black uppercase hover:bg-red-500/30 transition-all"
                                                >
                                                    Sì
                                                </button>
                                                <button
                                                    onClick={() => setConfirmRemoveId(null)}
                                                    className="px-2.5 py-1 bg-white/5 text-white/60 rounded-lg text-[8px] font-black uppercase hover:bg-white/10 transition-all"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmRemoveId(role.id)}
                                                className="p-3 md:p-4 text-white/5 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all md:opacity-0 group-hover:opacity-100 btn-press shrink-0"
                                                title="Rimuovi Accesso"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                            );
                        })}
                        {assemblyRoles.length === 0 && (
                            <div className="md:col-span-2 py-16 md:py-24 text-center border-2 border-dashed border-white/5 rounded-[2rem] md:rounded-[2.5rem] bg-black/10">
                                <Search className="w-10 h-10 md:w-12 md:h-12 text-white/5 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">Nessun collaboratore autorizzato</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};
