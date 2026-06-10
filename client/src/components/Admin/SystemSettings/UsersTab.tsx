import React from 'react';
import { Search, Download, Filter, Trash2, X, Users, Calendar, Database, History, CheckCircle2, ArrowLeft } from "lucide-react";
import type { UserProfile } from "../../../types";
import Papa from "papaparse";
import { getTodayIT } from "../../../utils/dateUtils";

interface UsersTabProps {
    registeredUsers: UserProfile[];
    filteredUsers: UserProfile[];
    userSearch: string;
    setUserSearch: (val: string) => void;
    userRoleFilter: string;
    setUserRoleFilter: (val: string) => void;
    selectedUser: UserProfile | null;
    setSelectedUser: (val: UserProfile | null) => void;
    userLogs: any[];
    loadingLogs: boolean;
    getRoleBadge: (role: string) => string;
    confirmDeleteUser: (user: UserProfile) => void;
    searchLoading: boolean;
    totalUsersCount: number;
}

export const UsersTab: React.FC<UsersTabProps> = ({
    registeredUsers, filteredUsers, userSearch, setUserSearch,
    userRoleFilter, setUserRoleFilter, selectedUser, setSelectedUser,
    userLogs, loadingLogs, getRoleBadge, confirmDeleteUser,
    searchLoading, totalUsersCount
}) => {
    const exportUsersCSV = () => {
        const data = filteredUsers.map(u => ({
            "Email": u.email,
            "Nome Completo": u.displayName || "-",
            "Ruolo": u.role,
            "UID": u.uid,
        }));
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `utenti_sistema_${getTodayIT()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-widest italic text-white/90">Utenti Registrati</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{totalUsersCount} account &mdash; ricerca on-demand</p>
                </div>
                <button
                    onClick={exportUsersCSV}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shrink-0"
                >
                    <Download className="w-4 h-4" /> Esporta CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Cerca per email o nome..."
                        className="w-full bg-white/3 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium text-sm"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 bg-white/3 border border-white/5 p-1.5 rounded-2xl overflow-x-auto no-scrollbar shrink-0">
                    <Filter className="w-4 h-4 text-white/20 self-center ml-1 shrink-0" />
                    {['ALL', 'SVILUPPATORE', 'ADMIN', 'STUDENT'].map(role => (
                        <button
                            key={role}
                            onClick={() => setUserRoleFilter(role)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${userRoleFilter === role ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
                        >
                            {role === 'ALL' ? 'Tutti' : role.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3">
                {[
                    { role: 'SVILUPPATORE', label: 'Sviluppatore', color: 'text-purple-400' },
                    { role: 'ADMIN', label: 'Admin', color: 'text-primary' },
                    { role: 'STUDENT', label: 'Studenti', color: 'text-white/50' },
                ].map(s => (
                    <div key={s.role} className="bg-white/2 border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-2">
                        <span className={`font-black text-lg ${s.color}`}>{registeredUsers.filter(u => u.role === s.role).length}</span>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Users Table */}
            <div className="bg-white/2 border border-white/5 rounded-[2rem] overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/5 bg-black/20 text-[10px] font-black uppercase tracking-widest text-white/40">
                    <div className="col-span-5 md:col-span-4">Utente</div>
                    <div className="col-span-4 md:col-span-5">Email</div>
                    <div className="col-span-3 text-right">Ruolo</div>
                </div>
                <div className="divide-y divide-white/5 max-h-[55vh] overflow-y-auto">
                    {searchLoading ? (
                        <div className="p-16 text-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 animate-pulse">Ricerca in corso...</span>
                        </div>
                    ) : (
                        filteredUsers.map((u, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedUser(selectedUser?.uid === u.uid ? null : u)}
                                className="w-full grid grid-cols-12 gap-4 p-5 items-center hover:bg-white/5 transition-colors group text-left"
                            >
                                <div className="col-span-5 md:col-span-4 flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${getRoleBadge(u.role).split(' ')[0]} border border-white/10`}>
                                        {(u.displayName || u.email)[0]?.toUpperCase()}
                                    </div>
                                    <span className="font-bold text-sm truncate text-white/90">{u.displayName || '—'}</span>
                                </div>
                                <div className="col-span-4 md:col-span-5 min-w-0">
                                    <span className="text-xs text-white/50 font-medium truncate block">{u.email}</span>
                                </div>
                                <div className="col-span-3 flex justify-end">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${getRoleBadge(u.role)}`}>
                                        {u.role.replace('_', ' ')}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                    {!searchLoading && filteredUsers.length === 0 && (
                        <div className="p-12 text-center text-white/30 font-medium text-sm">
                            Nessun utente trovato con i filtri correnti.
                        </div>
                    )}
                </div>
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex items-start justify-between bg-white/2 sticky top-0 backdrop-blur-xl z-20">
                            <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl ${getRoleBadge(selectedUser.role).split(' ')[0]} border border-white/10 shadow-xl`}>
                                    {(selectedUser.displayName || selectedUser.email)[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-black text-white text-3xl tracking-tighter uppercase italic">{selectedUser.displayName || 'Utente Senza Nome'}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-white/40 text-sm font-medium">{selectedUser.email}</span>
                                        <div className="w-1 h-1 rounded-full bg-white/20" />
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getRoleBadge(selectedUser.role)}`}>
                                            {selectedUser.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-3 hover:bg-white/5 rounded-full transition-all group">
                                <X className="w-6 h-6 text-white/20 group-hover:text-white" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Ruolo Sistema', value: selectedUser.role.replace('_', ' '), icon: <Users className="w-4 h-4 text-primary" /> },
                                    { label: 'Email Account', value: selectedUser.email, icon: <Calendar className="w-4 h-4 text-blue-400" /> },
                                    { label: 'Identificativo (UID)', value: selectedUser.uid, icon: <Database className="w-4 h-4 text-purple-400" />, mono: true },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/2 border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2 text-white/30 mb-2">
                                            {item.icon}
                                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <p className={`text-sm font-bold text-white/80 ${item.mono ? 'font-mono text-[11px] break-all' : 'truncate'}`}>{item.value}</p>
                                    </div>
                                ))}

                                {/* Account Management Action */}
                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 flex flex-col justify-between group hover:bg-rose-500/10 transition-all">
                                    <div className="flex items-center gap-2 text-rose-400/50 mb-2">
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Azioni Distruttive</span>
                                    </div>
                                    <button
                                        onClick={() => confirmDeleteUser(selectedUser)}
                                        className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-rose-500/0 hover:shadow-rose-500/20"
                                    >
                                        Elimina Account
                                    </button>
                                </div>
                            </div>

                            {/* Activity History Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                            <History className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-black uppercase tracking-widest text-white/80 italic">Storico Attività Recentissime</h5>
                                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Ultimi log dal sistema di accesso</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-bold text-white/30 truncate">
                                        Real-time Data
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5 shadow-inner">
                                    {loadingLogs ? (
                                        <div className="p-16 text-center">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Interrogazione database...</span>
                                        </div>
                                    ) : userLogs.length === 0 ? (
                                        <div className="p-20 text-center">
                                            <div className="w-12 h-12 bg-white/2 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Filter className="w-6 h-6 text-white/10" />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/10 italic">Nessuna attività presente nel registro</span>
                                        </div>
                                    ) : (
                                        userLogs.map((log) => (
                                            <div key={log.id} className="p-6 flex items-center justify-between hover:bg-white/[0.03] transition-colors group">
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${log.type === 'CHECKIN' ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10' :
                                                        log.type === 'CHECKOUT' ? 'bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/10' :
                                                            'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10'
                                                        }`}>
                                                        {log.type === 'CHECKIN' ? <CheckCircle2 className="w-6 h-6" /> : <History className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white italic tracking-tight">{log.activityName || log.message || log.type}</p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{new Date(log.timestamp).toLocaleString('it-IT')}</p>
                                                            {log.turn && (
                                                                <>
                                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Turno {log.turn}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                                        <ArrowLeft className="w-4 h-4 text-white/20 rotate-180" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-black/40 border-t border-white/5 flex justify-end">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                            >
                                Chiudi Dettaglio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
