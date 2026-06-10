import React from 'react';
import { Plus, Search, Trash2 } from "lucide-react";
import type { UserProfile } from "../../../types";

interface RolesTabProps {
    userProfile: UserProfile | null;
    roleSearch: string;
    setRoleSearch: (val: string) => void;
    filteredAdmins: { email: string; isDeveloper: boolean; addedAt?: number }[];
    showAddForm: boolean;
    setShowAddForm: (val: boolean) => void;
    newAdminEmail: string;
    setNewAdminEmail: (val: string) => void;
    isSaving: boolean;
    handleAddAdmin: (e: React.FormEvent) => void;
    handleRemoveAdmin: (email: string) => void;
}

export const RolesTab: React.FC<RolesTabProps> = ({
    userProfile, roleSearch, setRoleSearch, filteredAdmins,
    showAddForm, setShowAddForm, newAdminEmail, setNewAdminEmail,
    isSaving, handleAddAdmin, handleRemoveAdmin
}) => {
    const canManage = userProfile?.role === 'SVILUPPATORE';

    return (
        <div className="space-y-6">
            {/* Header & Add Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-widest italic text-white/90">Gestione Amministratori</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Aggiungi per email — il ruolo viene assegnato al primo accesso</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shrink-0"
                    >
                        <Plus className="w-4 h-4" /> {showAddForm ? 'Annulla' : 'Aggiungi Admin'}
                    </button>
                )}
            </div>

            {/* Add Admin Form */}
            {showAddForm && (
                <form onSubmit={handleAddAdmin} className="bg-primary/5 border border-primary/20 rounded-3xl p-6 animate-in slide-in-from-top-4 duration-300 space-y-4">
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tighter text-primary">Aggiungi Nuovo Amministratore</h4>
                        <p className="text-[11px] text-primary/60 font-medium mt-1">Inserisci l'email — il ruolo <strong className="text-primary">ADMIN</strong> verrà assegnato automaticamente al loro primo accesso.</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="email"
                            required
                            placeholder="Email istituzionale (es. mario.rossi@liceoagnesi.edu.it)"
                            className="flex-1 bg-black/40 border-2 border-white/5 rounded-2xl py-3 px-4 outline-none focus:border-primary/50 transition-all font-medium text-sm"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={isSaving || !newAdminEmail}
                            className="px-6 py-3 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shrink-0"
                        >
                            {isSaving ? 'Salvataggio...' : 'Autorizza Email'}
                        </button>
                    </div>
                </form>
            )}

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Cerca admin per email..."
                    className="w-full bg-white/3 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium text-sm"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-white/2 border border-white/5 rounded-[2rem] overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/5 bg-black/20 text-[10px] font-black uppercase tracking-widest text-white/40">
                    <div className="col-span-7 md:col-span-6">Utente / Email</div>
                    <div className="col-span-3 md:col-span-4 text-center">Ruolo</div>
                    <div className="col-span-2 text-right">Azione</div>
                </div>
                <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                    {filteredAdmins.map((r, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-white/5 transition-colors group">
                            <div className="col-span-7 md:col-span-6 flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${r.isDeveloper ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' : 'bg-primary/10 border border-primary/20 text-primary'}`}>
                                    {r.email[0]?.toUpperCase()}
                                </div>
                                <span className="font-bold text-sm truncate">{r.email}</span>
                            </div>
                            <div className="col-span-3 md:col-span-4 flex items-center justify-center gap-2 flex-wrap">
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${r.isDeveloper ? 'bg-purple-500/20 text-purple-400' : 'bg-primary/20 text-primary'}`}>
                                    {r.isDeveloper ? 'SVILUPPATORE' : 'ADMIN'}
                                </span>
                            </div>
                            <div className="col-span-2 text-right flex items-center justify-end">
                                {!r.isDeveloper && canManage &&
                                    userProfile?.email?.toLowerCase() !== r.email.toLowerCase() && (
                                        <button
                                            onClick={() => handleRemoveAdmin(r.email)}
                                            className="p-1.5 opacity-40 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 rounded-md transition-all"
                                            title="Rimuovi accesso admin"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                            </div>
                        </div>
                    ))}
                    {filteredAdmins.length === 0 && (
                        <div className="p-12 text-center text-white/30 font-medium text-sm">
                            Nessun amministratore trovato.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
