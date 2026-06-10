import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import type { Activity, Room } from '../../types';
import { MapPin, Plus, Trash2, AlertCircle, Loader2, AlertTriangle, Layers, Clock, Users, Edit2 } from "lucide-react";
import { logAudit } from "../../utils/auditLogger";
import { useAuth } from "../../hooks/useAuth";

interface LogisticsManagerProps {
    assemblyId: string;
}

export const LogisticsManager: React.FC<LogisticsManagerProps> = ({ assemblyId }) => {
    const { userProfile } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [newRoom, setNewRoom] = useState({ name: "", capacity: 40, floor: "", room_number: "" });
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [editRoomForm, setEditRoomForm] = useState({ name: "", capacity: 40, floor: "", room_number: "" });

    useEffect(() => {
        const qA = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
        const unsubscribeA = onSnapshot(qA, (snapshot) => {
            setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
        }, (error) => {
            console.error("[LogisticsManager] Activities listener error:", error);
        });

        const qR = query(collection(db, "physical_rooms"), where("assemblyId", "==", assemblyId));
        const unsubscribeR = onSnapshot(qR, (snapshot) => {
            setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)));
        }, (error) => {
            console.error("[LogisticsManager] Physical rooms listener error:", error);
        });

        return () => {
            unsubscribeA();
            unsubscribeR();
        };
    }, [assemblyId]);

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoom.name) return;
        setIsSaving(true);
        const roomId = `${assemblyId}_${newRoom.name.replace(/\s+/g, '-').toLowerCase()}`;
        try {
            await setDoc(doc(db, "physical_rooms", roomId), {
                id: roomId,
                assemblyId,
                name: newRoom.name,
                capacity: newRoom.capacity,
                floor: newRoom.floor || null,
                room_number: newRoom.room_number || null
            });

            // Log Audit Event
            const details = `Creata aula fisica "${newRoom.name}" con capienza ${newRoom.capacity}${newRoom.floor ? `, Piano: ${newRoom.floor}` : ''}${newRoom.room_number ? `, N. Aula: ${newRoom.room_number}` : ''}`;
            await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', details, assemblyId, roomId);

            setNewRoom({ name: "", capacity: 40, floor: "", room_number: "" });
        } catch (error) {
            console.error("Error creating room:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRoom = async (id: string) => {
        try {
            const room = rooms.find(r => r.id === id);
            await deleteDoc(doc(db, "physical_rooms", id));

            // Log Audit Event
            if (room) {
                const details = `Eliminata aula fisica "${room.name}"`;
                await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', details, assemblyId, id);
            }

            setConfirmDeleteId(null);
        } catch (error) {
            console.error("Error deleting room:", error);
        }
    };

    const startEditingRoom = (room: Room) => {
        setEditingRoomId(room.id);
        setEditRoomForm({
            name: room.name,
            capacity: room.capacity,
            floor: room.floor || "",
            room_number: room.room_number || ""
        });
        setConfirmDeleteId(null);
    };

    const handleUpdateRoom = async (roomId: string) => {
        setIsSaving(true);
        try {
            const oldRoom = rooms.find(r => r.id === roomId);
            if (!oldRoom) return;

            // 1. Aggiorna l'aula fisica
            await setDoc(doc(db, "physical_rooms", roomId), {
                name: editRoomForm.name,
                capacity: editRoomForm.capacity,
                floor: editRoomForm.floor || null,
                room_number: editRoomForm.room_number || null
            }, { merge: true });

            // 2. Aggiorna le attività collegate (denormalizzazione)
            const affectedActivities = activities.filter(a => a.location_name === oldRoom.name);
            await Promise.all(affectedActivities.map(activity => {
                return updateDoc(doc(db, "rooms", activity.id), {
                    location_name: editRoomForm.name,
                    location_floor: editRoomForm.floor || null,
                    location_number: editRoomForm.room_number || null
                });
            }));

            // Log Audit Event
            const details = `Aggiornata aula fisica "${oldRoom.name}" → "${editRoomForm.name}" (Capienza: ${oldRoom.capacity} → ${editRoomForm.capacity}, Piano: "${oldRoom.floor || ''}" → "${editRoomForm.floor || ''}", N. Aula: "${oldRoom.room_number || ''}" → "${editRoomForm.room_number || ''}")`;
            await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', details, assemblyId, roomId);

            setEditingRoomId(null);
        } catch (error) {
            console.error("Error updating room:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateActivityRoom = async (activityId: string, roomName: string) => {
        const selectedRoom = rooms.find(r => r.name === roomName);
        const activity = activities.find(a => a.id === activityId);
        
        await updateDoc(doc(db, "rooms", activityId), {
            location_name: roomName,
            location_floor: selectedRoom?.floor || null,
            location_number: selectedRoom?.room_number || null
        });

        // Log Audit Event
        const details = `Assegnata aula "${roomName}" all'attività "${activity?.name || activityId}"`;
        await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', details, assemblyId, activityId);
    };

    const turns = ["1", "2", "3"];

    return (
        <div className="w-full flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-white/2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-3 italic">
                        <Layers className="w-6 h-6 md:w-8 md:h-8 text-primary" /> Logistica & Spazi
                    </h2>
                    <p className="text-white/20 text-[10px] md:text-sm font-medium mt-1 uppercase tracking-widest">Mappatura aule e attività educative</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-10 md:space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Column 1: Room Builder */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 space-y-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2 relative z-10">
                                <Plus className="w-4 h-4" /> Nuovo Spazio
                            </h3>
                            <form onSubmit={handleCreateRoom} className="space-y-4 relative z-10">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Classe / Nome Aula</label>
                                    <input
                                        required
                                        className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 outline-none focus:border-primary/50 transition-all font-bold text-sm focus:ring-1 focus:ring-primary/10"
                                        placeholder="Es. 4ESA"
                                        value={newRoom.name}
                                        onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Capienza massima studenti</label>
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10" />
                                        <input
                                            type="number"
                                            className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-bold text-sm focus:ring-1 focus:ring-primary/10"
                                            value={newRoom.capacity}
                                            onChange={e => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Piano (opzionale)</label>
                                        <input
                                            className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-3 outline-none focus:border-primary/50 transition-all font-bold text-xs focus:ring-1 focus:ring-primary/10"
                                            placeholder="Es. 2, T, S"
                                            value={newRoom.floor}
                                            onChange={e => setNewRoom({ ...newRoom, floor: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Numero Aula (opzionale)</label>
                                        <input
                                            className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-3 outline-none focus:border-primary/50 transition-all font-bold text-xs focus:ring-1 focus:ring-primary/10"
                                            placeholder="Es. Aula 7, Lab 2"
                                            value={newRoom.room_number}
                                            onChange={e => setNewRoom({ ...newRoom, room_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-primary text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 btn-press"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aggiungi Spazio"}
                                </button>
                            </form>
                        </div>

                        <div className="space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10 ml-2 mb-2">Aule Censite ({rooms.length})</p>
                            {rooms.map(room => (
                                editingRoomId === room.id ? (
                                    <div key={room.id} className="bg-white/[0.03] border border-primary/30 p-4 rounded-2xl flex flex-col gap-3 transition-all animate-in fade-in duration-300">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Classe/Aula</label>
                                                <input
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2.5 outline-none focus:border-primary/50 text-[11px] font-bold"
                                                    value={editRoomForm.name}
                                                    onChange={e => setEditRoomForm({ ...editRoomForm, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Capienza</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2.5 outline-none focus:border-primary/50 text-[11px] font-bold"
                                                    value={editRoomForm.capacity}
                                                    onChange={e => setEditRoomForm({ ...editRoomForm, capacity: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Piano</label>
                                                <input
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2.5 outline-none focus:border-primary/50 text-[11px] font-bold"
                                                    value={editRoomForm.floor}
                                                    onChange={e => setEditRoomForm({ ...editRoomForm, floor: e.target.value })}
                                                    placeholder="Es. 2, T, S"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">N. Aula</label>
                                                <input
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2.5 outline-none focus:border-primary/50 text-[11px] font-bold"
                                                    value={editRoomForm.room_number}
                                                    onChange={e => setEditRoomForm({ ...editRoomForm, room_number: e.target.value })}
                                                    placeholder="Es. Aula 7"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1.5 border-t border-white/5">
                                            <button
                                                onClick={() => setEditingRoomId(null)}
                                                className="px-2.5 py-1 text-white/40 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider"
                                            >
                                                Annulla
                                            </button>
                                            <button
                                                onClick={() => handleUpdateRoom(room.id)}
                                                className="bg-primary text-black px-3.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider btn-press"
                                            >
                                                Salva
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={room.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex justify-between items-center group transition-all hover:bg-white/[0.05] hover:border-white/10">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-[11px] uppercase tracking-tight truncate">{room.name}</p>
                                                <p className="text-[9px] text-white/20 font-bold tracking-widest uppercase">
                                                    CAP: {room.capacity}
                                                    {room.floor && ` • PIANO: ${room.floor}`}
                                                    {room.room_number && ` • AULA: ${room.room_number}`}
                                                </p>
                                            </div>
                                        </div>
                                        {confirmDeleteId === room.id ? (
                                            <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300 shrink-0">
                                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest px-1">Eliminare?</span>
                                                <button
                                                    onClick={() => handleDeleteRoom(room.id)}
                                                    className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] font-black uppercase hover:bg-red-500/30 transition-all"
                                                >
                                                    Sì
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-2 py-0.5 bg-white/5 text-white/60 rounded text-[9px] font-black uppercase hover:bg-white/10 transition-all"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                                                <button 
                                                    onClick={() => startEditingRoom(room)} 
                                                    className="p-2 text-white/40 hover:text-primary hover:bg-primary/10 rounded-lg transition-all btn-press"
                                                    title="Modifica"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => setConfirmDeleteId(room.id)} 
                                                    className="p-2 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all btn-press"
                                                    title="Elimina"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            ))}
                        </div>
                    </div>

                    {/* Column 2-4: Visual Grid */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-white/5 bg-white/2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/60">Griglia Occupazione Spazi</h3>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                                    <Clock className="w-3 h-3 text-primary/60" /> Live Monitoring
                                </div>
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 text-white/20 text-[10px] font-black uppercase tracking-widest">
                                            <th className="px-6 py-4 border-r border-white/5 w-48">Aula / Spazio</th>
                                            {turns.map(t => (
                                                <th key={t} className="px-6 py-4 text-center border-r border-white/5 uppercase">Turno {t}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {rooms.map(room => (
                                            <tr key={room.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-8 border-r border-white/5 bg-white/[0.01]">
                                                    <p className="font-black text-sm uppercase tracking-tighter">{room.name}</p>
                                                    <p className="text-[9px] text-white/20 font-bold mt-1 uppercase">
                                                        Posti: {room.capacity}
                                                        {room.floor && ` • Piano: ${room.floor}`}
                                                        {room.room_number && ` • ${room.room_number}`}
                                                    </p>
                                                </td>
                                                {turns.map(t => {
                                                    const assignedActivities = activities.filter(a => a.location_name === room.name && a.turn_ids?.includes(t));
                                                    const hasConflict = assignedActivities.length > 1;
                                                    const totalLoad = assignedActivities.reduce((acc, curr) => acc + curr.max_capacity, 0);
                                                    const isOverCap = totalLoad > room.capacity;

                                                    return (
                                                        <td key={t} className={`px-4 py-4 border-r border-white/5 relative align-top min-w-[200px] transition-all duration-500 ${hasConflict ? 'bg-red-500/[0.08]' : ''}`}>
                                                            <div className="space-y-3">
                                                                {assignedActivities.map(activity => (
                                                                    <div key={activity.id} className={`border p-3 rounded-2xl relative group transition-all duration-300 ${hasConflict ? 'bg-red-500/20 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08]'}`}>
                                                                        <p className="font-black text-[10px] uppercase leading-tight break-words">{activity.name}</p>
                                                                        <p className="text-[9px] text-white/20 mt-1 font-bold italic tracking-wider">{activity.max_capacity} POSTI</p>
                                                                        {isOverCap && !hasConflict && (
                                                                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                                                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                {assignedActivities.length === 0 && (
                                                                    <div className="h-20 flex items-center justify-center border-2 border-dashed border-white/[0.03] rounded-2xl group/empty transition-all hover:bg-white/[0.02]">
                                                                        <span className="text-[9px] font-black text-white/[0.03] group-hover/empty:text-white/[0.08] uppercase tracking-[0.3em] transition-all">DISPONIBILE</span>
                                                                    </div>
                                                                )}
                                                                {hasConflict && (
                                                                    <div className="flex items-center gap-2 text-[8px] font-black text-red-500 uppercase tracking-widest mt-2 px-2 py-1.5 bg-red-500/10 rounded-lg animate-pulse border border-red-500/20">
                                                                        <AlertTriangle className="w-3.5 h-3.5" /> CONFLITTO ATTIVO
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-white/5">
                                {rooms.map(room => (
                                    <div key={room.id} className="p-6 space-y-4">
                                        <div className="flex justify-between items-center bg-white/[0.03] p-4 rounded-2xl">
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight">{room.name}</p>
                                                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">
                                                    Capienza: {room.capacity}
                                                    {room.floor && ` • Piano: ${room.floor}`}
                                                    {room.room_number && ` • ${room.room_number}`}
                                                </p>
                                            </div>
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {turns.map(t => {
                                                const assignedActivities = activities.filter(a => a.location_name === room.name && a.turn_ids?.includes(t));
                                                const hasConflict = assignedActivities.length > 1;
                                                return (
                                                    <div key={t} className={`p-4 rounded-2xl border ${hasConflict ? 'bg-red-500/10 border-red-500/20' : 'bg-black/20 border-white/5'}`}>
                                                        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">TURNO {t}</span>
                                                            {hasConflict && <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />}
                                                        </div>
                                                        <div className="space-y-2">
                                                            {assignedActivities.map(activity => (
                                                                <div key={activity.id} className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[11px] font-black uppercase text-white tracking-tight">{activity.name}</p>
                                                                    <p className="text-[9px] text-white/20 font-bold mt-1 uppercase italic">{activity.max_capacity} POSTI</p>
                                                                </div>
                                                            ))}
                                                            {assignedActivities.length === 0 && (
                                                                <p className="text-[10px] font-bold text-white/5 uppercase tracking-widest text-center py-2 italic">DISPONIBILE</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {rooms.length === 0 && (
                                <div className="py-24 text-center">
                                    <MapPin className="w-12 h-12 text-white/5 mx-auto mb-4" />
                                    <p className="text-white/20 uppercase font-black text-xs tracking-widest">Aggiungi aule per iniziare la mappatura</p>
                                </div>
                            )}
                        </div>

                        {/* Unassigned Activities */}
                        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-1000">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                    Attività da Collocare ({activities.filter(a => !a.location_name).length})
                                </h3>
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest ml-4">
                                    Attività create ma senza un'aula assegnata. Assegna uno spazio per renderle visibili nella griglia.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {activities.filter(a => !a.location_name).map(activity => (
                                    <div key={activity.id} className="bg-black/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between group hover:border-primary/40 transition-all duration-300 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-2xl pointer-events-none" />
                                        <div className="relative z-10">
                                            <p className="font-black text-xs md:text-sm mb-3 uppercase tracking-tight">{activity.name}</p>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {activity.turn_ids?.map(t => (
                                                    <span key={t} className="px-2 py-0.5 bg-white/5 text-white/20 rounded-[4px] text-[8px] font-black border border-white/5">T{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-5 flex items-center gap-3 relative z-10">
                                            <select
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-[10px] font-black outline-none focus:border-primary transition-all cursor-pointer appearance-none text-center"
                                                onChange={e => updateActivityRoom(activity.id, e.target.value)}
                                                value=""
                                            >
                                                <option value="">ASSEGNA AULA...</option>
                                                {rooms.map(r => (
                                                    <option key={r.id} value={r.name} className="bg-surface text-white">{r.name} ({r.capacity}p)</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
