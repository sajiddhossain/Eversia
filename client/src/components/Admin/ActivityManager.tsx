import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import type { Activity, Room } from '../../types';
import { Plus, Trash2, Key, MapPin, Users, Loader2, Edit2, Save, Database, AlertCircle } from "lucide-react";
import { useAuth } from '../../hooks/useAuth';
import { logAudit } from "../../utils/auditLogger";
import { AttendanceExport } from "./AttendanceExport";

interface ActivityManagerProps {
    assemblyId: string;
    onClose: () => void;
}

export const ActivityManager: React.FC<ActivityManagerProps> = ({ assemblyId }) => {
    const { userProfile } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [newActivity, setNewActivity] = useState<Partial<Activity>>({
        turn_ids: ["1"],
        max_capacity: 40,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Activity>>({});

    useEffect(() => {
        const qA = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
        const unsubscribeA = onSnapshot(qA, (snapshot) => {
            setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
            setLoading(false);
        }, (error) => {
            console.error("[ActivityManager] Activities listener error:", error);
            setLoading(false);
        });

        const qR = query(collection(db, "physical_rooms"), where("assemblyId", "==", assemblyId));
        const unsubscribeR = onSnapshot(qR, (snapshot) => {
            setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)).sort((a, b) => a.name.localeCompare(b.name)));
        }, (error) => {
            console.error("[ActivityManager] Physical rooms listener error:", error);
        });

        return () => {
            unsubscribeA();
            unsubscribeR();
        };
    }, [assemblyId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newActivity.name || !newActivity.turn_ids || newActivity.turn_ids.length === 0) return;
        setIsSaving(true);
        setErrorMsg(null);

        const safeName = newActivity.name.replace(/\s+/g, '-').toLowerCase();
        const primaryTurn = newActivity.turn_ids[0];
        const activityId = `${assemblyId}_T${primaryTurn}_${safeName}_${Math.random().toString(36).substring(2, 5)}`;

        // Auto-generate 6 digit PIN
        const accessPin = Math.floor(100000 + Math.random() * 900000).toString();

        const selectedRoom = rooms.find(r => r.name === newActivity.location_name);
        const activityData: Activity = {
            id: activityId,
            assemblyId,
            name: newActivity.name,
            turn_ids: newActivity.turn_ids || ["1"],
            location_name: newActivity.location_name || "",
            max_capacity: newActivity.max_capacity || 40,
            counts_by_turn: {},
            access_pin: accessPin,
            description: newActivity.description || "",
            location_floor: selectedRoom?.floor || undefined,
            location_number: selectedRoom?.room_number || undefined
        };

        try {
            await setDoc(doc(db, "rooms", activityId), activityData);
            await logAudit('ACTIVITY_CREATED', userProfile?.email || 'System', `Creata attività: ${activityData.name} in ${activityData.location_name} per i turni: ${activityData.turn_ids.join(', ')}`, assemblyId, activityId);
            setNewActivity({ turn_ids: newActivity.turn_ids, max_capacity: 40 });
        } catch (error) {
            console.error("Error creating activity:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editForm.name || !editForm.turn_ids || editForm.turn_ids.length === 0) return;
        setIsSaving(true);
        setErrorMsg(null);

        // Strict Verification for Update
        const selectedRoom = rooms.find(r => r.name === editForm.location_name);
        const hasConflict = activities.some(a =>
            a.id !== id &&
            a.location_name === editForm.location_name &&
            a.turn_ids?.some(t => editForm.turn_ids?.includes(t))
        );
        const isOverCap = selectedRoom && (editForm.max_capacity || 0) > selectedRoom.capacity;

        if (hasConflict || isOverCap) {
            setErrorMsg(hasConflict ? "L'aula è già occupata in uno dei turni selezionati!" : "La capienza inserita supera la capacità fisica dell'aula.");
            setTimeout(() => setErrorMsg(null), 6000);
            setIsSaving(false);
            return;
        }

        const updatedForm = {
            ...editForm,
            location_floor: selectedRoom?.floor || null,
            location_number: selectedRoom?.room_number || null
        };

        try {
            const oldActivity = activities.find(a => a.id === id);
            const changes: string[] = [];
            
            if (oldActivity) {
                if (editForm.name && editForm.name !== oldActivity.name) {
                    changes.push(`Nome: "${oldActivity.name}" → "${editForm.name}"`);
                }
                if (editForm.description !== oldActivity.description) {
                    changes.push(`Descrizione modificata`);
                }
                if (editForm.location_name !== oldActivity.location_name) {
                    changes.push(`Aula: "${oldActivity.location_name || 'Nessuna'}" → "${editForm.location_name || 'Nessuna'}"`);
                }
                if (editForm.max_capacity !== oldActivity.max_capacity) {
                    changes.push(`Capienza: ${oldActivity.max_capacity} → ${editForm.max_capacity}`);
                }
                const oldTurns = [...(oldActivity.turn_ids || [])].sort().join(',');
                const newTurns = [...(editForm.turn_ids || [])].sort().join(',');
                if (oldTurns !== newTurns) {
                    changes.push(`Turni: [${oldActivity.turn_ids?.join(', ')}] → [${editForm.turn_ids?.join(', ')}]`);
                }
            }

            const details = `Aggiornata attività "${editForm.name}": ${changes.length > 0 ? changes.join(', ') : 'Nessuna variazione'}`;

            await setDoc(doc(db, "rooms", id), updatedForm, { merge: true });
            await logAudit('ACTIVITY_UPDATED', userProfile?.email || 'System', details, assemblyId, id);
            setEditingId(null);
        } catch (error) {
            console.error("Error updating activity:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (activity: Activity) => {
        setEditingId(activity.id);
        setEditForm(activity);
        setErrorMsg(null);
    };

    const handleDelete = async (id: string) => {
        const activity = activities.find(a => a.id === id);
        try {
            await deleteDoc(doc(db, "rooms", id));
            if (activity) {
                await logAudit('ACTIVITY_DELETED', userProfile?.email || 'System', `Eliminata attività: ${activity.name}`, assemblyId, id);
            }
            setConfirmDeleteId(null);
        } catch (error) {
            console.error("Error deleting activity:", error);
        }
    };

    return (
        <div className="w-full flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-6 md:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
                <div>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest italic flex items-center gap-3">
                        <Database className="w-6 h-6 text-primary" /> Gestione Attività
                    </h2>
                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-1">Configura i moduli per questa assemblea</p>
                </div>
            </div>


            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-10 md:space-y-12">
                {/* Error Banner */}
                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-black uppercase tracking-wider">{errorMsg}</p>
                    </div>
                )}

                {/* Create New Activity */}
                <form onSubmit={handleCreate} className="bg-white/[0.03] border border-white/10 p-6 md:p-8 rounded-[2rem] space-y-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 relative z-10">Aggiungi Nuova Attività</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Nome Attività</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 outline-none focus:border-primary/50 transition-all font-bold text-sm focus:ring-1 focus:ring-primary/10"
                                placeholder="Es. Torneo Scacchi"
                                value={newActivity.name || ""}
                                onChange={e => setNewActivity({ ...newActivity, name: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Descrizione Attività (Max 300 car.)</label>
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                                    {(newActivity.description || "").length}/300
                                </span>
                            </div>
                            <textarea
                                maxLength={300}
                                rows={3}
                                placeholder="es. Laboratorio di robotica avanzata e coding..."
                                className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 outline-none focus:border-primary/50 transition-all font-bold text-sm focus:ring-1 focus:ring-primary/10 resize-none"
                                value={newActivity.description || ""}
                                onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Ubicazione (Aula)</label>
                            <select
                                className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 outline-none focus:border-primary/50 transition-all font-bold text-sm appearance-none cursor-pointer"
                                value={newActivity.location_name || ""}
                                onChange={e => {
                                    const selectedRoom = rooms.find(r => r.name === e.target.value);
                                    setNewActivity({
                                        ...newActivity,
                                        location_name: e.target.value,
                                        max_capacity: selectedRoom ? selectedRoom.capacity : newActivity.max_capacity
                                    });
                                }}
                            >
                                <option value="">- Seleziona Aula -</option>
                                {rooms.map(r => (
                                    <option key={r.id} value={r.name}>{r.name} (Cap. {r.capacity})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Turni Attivazione</label>
                                <div className="flex gap-2">
                                    {["1", "2", "3"].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => {
                                                const current = newActivity.turn_ids || [];
                                                const next = current.includes(t)
                                                    ? current.filter(x => x !== t)
                                                    : [...current, t];
                                                setNewActivity({ ...newActivity, turn_ids: next });
                                            }}
                                            className={`flex-1 py-3 rounded-xl font-black text-xs transition-all btn-press ${(newActivity.turn_ids || []).includes(t)
                                                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                                : 'bg-black/40 border-2 border-white/5 text-white/20 hover:border-white/10'
                                                }`}
                                        >
                                            T{t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Capienza Max</label>
                                <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <input
                                        type="number"
                                        className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-bold text-sm focus:ring-1 focus:ring-primary/10"
                                        value={newActivity.max_capacity}
                                        onChange={e => setNewActivity({ ...newActivity, max_capacity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex items-end pt-2">
                            <button
                                type="submit"
                                disabled={isSaving || !newActivity.name || (() => {
                                    const selectedRoom = rooms.find(r => r.name === newActivity.location_name);
                                    const hasConflict = activities.some(a =>
                                        a.location_name === newActivity.location_name &&
                                        a.turn_ids?.some(t => (newActivity.turn_ids || []).includes(t))
                                    );
                                    const isOverCap = selectedRoom && (newActivity.max_capacity || 0) > selectedRoom.capacity;
                                    return hasConflict || isOverCap;
                                })()}
                                className="w-full h-[52px] bg-primary text-black font-black rounded-xl uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-lg shadow-primary/10 btn-press"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Crea Attività</>}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Activity List */}
                <div className="space-y-6 pb-12">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/20">Attività Esistenti ({activities.length})</h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Live sync attivo</span>
                        </div>
                    </div>
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activities.sort((a, b) => (a.turn_ids?.[0] || "").localeCompare(b.turn_ids?.[0] || "") || (a.name || "").localeCompare(b.name || "")).map(activity => (
                                <div key={activity.id} className={`bg-white/[0.02] border ${editingId === activity.id ? 'border-primary shadow-[0_0_30px_rgba(226,243,60,0.05)]' : 'border-white/5'} p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300 group hover:bg-white/[0.04] relative`}>
                                    {editingId === activity.id ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Nome</label>
                                                    <input
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary/50 text-white"
                                                        value={editForm.name || ""}
                                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                        placeholder="Nome"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center ml-1">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">Descrizione Attività (Max 300 car.)</label>
                                                        <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest">
                                                            {(editForm.description || "").length}/300
                                                        </span>
                                                    </div>
                                                    <textarea
                                                        maxLength={300}
                                                        rows={3}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold outline-none focus:border-primary/50 text-white resize-none"
                                                        value={editForm.description || ""}
                                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                        placeholder="Descrizione..."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Aula</label>
                                                    <select
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary/50 text-white appearance-none cursor-pointer text-left"
                                                        value={editForm.location_name || ""}
                                                        onChange={e => setEditForm({ ...editForm, location_name: e.target.value })}
                                                    >
                                                        <option value="">Nessuna Aula</option>
                                                        {rooms.map(r => (
                                                            <option key={r.id} value={r.name} className="bg-surface text-white">{r.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Turni</label>
                                                <div className="flex gap-2">
                                                    {["1", "2", "3"].map(t => (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = editForm.turn_ids || [];
                                                                const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
                                                                setEditForm({ ...editForm, turn_ids: next });
                                                            }}
                                                            className={`flex-1 py-2 rounded-lg font-black text-[10px] transition-all btn-press ${(editForm.turn_ids || []).includes(t) ? 'bg-primary text-black' : 'bg-black/40 text-white/20'
                                                                }`}
                                                        >
                                                            T{t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                                <button onClick={() => setEditingId(null)} className="px-4 py-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">Annulla</button>
                                                <button
                                                    onClick={() => handleUpdate(activity.id)}
                                                    disabled={(() => {
                                                        const selectedRoom = rooms.find(r => r.name === editForm.location_name);
                                                        const hasConflict = activities.some(a =>
                                                            a.id !== activity.id &&
                                                            a.location_name === editForm.location_name &&
                                                            a.turn_ids?.some(t => (editForm.turn_ids || []).includes(t))
                                                        );
                                                        const isOverCap = selectedRoom && (editForm.max_capacity || 0) > selectedRoom.capacity;
                                                        return hasConflict || isOverCap;
                                                    })()}
                                                    className="bg-primary text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-20 disabled:grayscale shadow-lg shadow-primary/20 btn-press"
                                                >
                                                    <Save className="w-3 h-3" /> Salva
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-5">
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0 flex-1 pr-4">
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {(activity.turn_ids || []).sort().map(t => (
                                                            <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary rounded-[6px] text-[8px] font-black uppercase tracking-wider border border-primary/20">T{t}</span>
                                                        ))}
                                                    </div>
                                                    <h4 className="font-black text-lg md:text-xl text-white tracking-tight leading-tight mb-1 group-hover:text-primary transition-colors">{activity.name}</h4>
                                                    {activity.description && (
                                                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.1em] mb-4 line-clamp-3 leading-relaxed italic whitespace-pre-line">{activity.description}</p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {activity.location_name || "N/D"}</span>
                                                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {activity.max_capacity} posti</span>
                                                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg"><Key className="w-3 h-3 text-primary" /> {activity.access_pin}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                    <button
                                                        onClick={() => startEditing(activity)}
                                                        className="p-2.5 md:p-3 bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary rounded-xl md:rounded-2xl transition-all btn-press"
                                                        title="Modifica"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {confirmDeleteId === activity.id ? (
                                                        <div className="flex items-center gap-1.5 bg-black/40 border border-red-500/20 p-1.5 rounded-xl animate-in fade-in slide-in-from-right-2 duration-300">
                                                            <span className="text-[8px] font-black text-red-400 uppercase tracking-widest px-1">Eliminare?</span>
                                                            <button
                                                                onClick={() => handleDelete(activity.id)}
                                                                className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-[8px] font-black uppercase hover:bg-red-500/30 transition-all"
                                                            >
                                                                Sì
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteId(null)}
                                                                className="px-2.5 py-1 bg-white/5 text-white/60 rounded-lg text-[8px] font-black uppercase hover:bg-white/10 transition-all"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDeleteId(activity.id)}
                                                            className="p-2.5 md:p-3 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 rounded-xl md:rounded-2xl transition-all btn-press"
                                                            title="Elimina"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Attendance Exports */}
                                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                                                {(activity.turn_ids || []).sort().map(t => (
                                                    <AttendanceExport
                                                        key={t}
                                                        assemblyId={assemblyId}
                                                        activityId={activity.id}
                                                        turnId={t}
                                                        activityName={activity.name}
                                                    />
                                                ))}
                                            </div>

                                            {/* Accent glow on hover */}
                                            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
