import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, limit, where, onSnapshot } from "firebase/firestore";
import type { AuditLogEntry, AuditAction } from '../../types';
import { auditActionLabel } from "../../utils/auditLogger";
import {
    Shield, Search, Download, Filter, User, Info,
    PlusCircle, Edit3, Trash2, UserPlus, UserMinus,
    Bell, Save, RefreshCw, Settings, FileInput,
    UserX, AlertTriangle, Award, UserCheck
} from "lucide-react";
import Papa from "papaparse";

interface Props {
    assemblyId?: string;
}

const actionConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    ASSEMBLY_CREATED: { color: "text-green-400 bg-green-400/10", icon: <PlusCircle className="w-4 h-4" /> },
    ASSEMBLY_UPDATED: { color: "text-blue-400 bg-blue-400/10", icon: <Edit3 className="w-4 h-4" /> },
    ASSEMBLY_DELETED: { color: "text-red-400 bg-red-400/10", icon: <Trash2 className="w-4 h-4" /> },
    ACTIVITY_CREATED: { color: "text-green-400 bg-green-400/10", icon: <PlusCircle className="w-4 h-4" /> },
    ACTIVITY_UPDATED: { color: "text-blue-400 bg-blue-400/10", icon: <Edit3 className="w-4 h-4" /> },
    ACTIVITY_DELETED: { color: "text-red-400 bg-red-400/10", icon: <Trash2 className="w-4 h-4" /> },
    ROLE_ASSIGNED: { color: "text-amber-400 bg-amber-400/10", icon: <UserPlus className="w-4 h-4" /> },
    ROLE_REMOVED: { color: "text-orange-400 bg-orange-400/10", icon: <UserMinus className="w-4 h-4" /> },
    ADMIN_ADDED: { color: "text-purple-400 bg-purple-400/10", icon: <Shield className="w-4 h-4" /> },
    ADMIN_REMOVED: { color: "text-red-400 bg-red-400/10", icon: <Shield className="w-4 h-4" /> },
    ANNOUNCEMENT_SENT: { color: "text-cyan-400 bg-cyan-400/10", icon: <Bell className="w-4 h-4" /> },
    TEMPLATE_SAVED: { color: "text-primary bg-primary/10", icon: <Save className="w-4 h-4" /> },
    PHASE_CHANGED: { color: "text-amber-400 bg-amber-400/10", icon: <RefreshCw className="w-4 h-4" /> },
    CONFIG_CHANGED: { color: "text-blue-400 bg-blue-400/10", icon: <Settings className="w-4 h-4" /> },
    BULK_IMPORT: { color: "text-green-400 bg-green-400/10", icon: <FileInput className="w-4 h-4" /> },
    INTEGRITY_COMMAND_syncRoomCounts: { color: "text-cyan-400 bg-cyan-400/10", icon: <RefreshCw className="w-4 h-4" /> },
    INTEGRITY_COMMAND_purgeGhostUsers: { color: "text-orange-400 bg-orange-400/10", icon: <UserX className="w-4 h-4" /> },
    INTEGRITY_COMMAND_forceResetTurn: { color: "text-amber-400 bg-amber-400/10", icon: <RefreshCw className="w-4 h-4" /> },
    INTEGRITY_COMMAND_emergencyEject: { color: "text-red-400 bg-red-400/10", icon: <AlertTriangle className="w-4 h-4" /> },
    INTEGRITY_COMMAND_recalculateGamificationStats: { color: "text-purple-400 bg-purple-400/10", icon: <Award className="w-4 h-4" /> },
    BADGE_CREATED: { color: "text-purple-400 bg-purple-400/10", icon: <Award className="w-4 h-4" /> },
    BADGE_DELETED: { color: "text-red-400 bg-red-400/10", icon: <Trash2 className="w-4 h-4" /> },
    BADGE_AWARDED: { color: "text-primary bg-primary/10", icon: <Award className="w-4 h-4" /> },
    BADGE_REVOKED: { color: "text-orange-400 bg-orange-400/10", icon: <UserMinus className="w-4 h-4" /> },
    TEMPLATE_DELETED: { color: "text-red-400 bg-red-400/10", icon: <Trash2 className="w-4 h-4" /> },
    WIPE_DATABASE: { color: "text-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]", icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
    STAFF_CHECKIN: { color: "text-emerald-400 bg-emerald-400/10", icon: <UserCheck className="w-4 h-4" /> },
    STAFF_CHECKOUT: { color: "text-rose-400 bg-rose-400/10", icon: <UserX className="w-4 h-4" /> },
};

const getTimestampMillis = (tsVal: any): number => {
    if (!tsVal) return 0;
    if (typeof tsVal === 'number') return tsVal;
    if (typeof tsVal === 'object') {
        if (tsVal.seconds !== undefined) {
            return tsVal.seconds * 1000;
        }
        if (typeof tsVal.toDate === 'function') {
            return tsVal.toDate().getTime();
        }
    }
    const d = new Date(tsVal);
    return isNaN(d.getTime()) ? 0 : d.getTime();
};

const formatDetails = (log: AuditLogEntry): string => {
    if (!log.details) return "";
    if (typeof log.details === 'string') return log.details;
    
    const d = log.details;
    if (log.action === 'INTEGRITY_COMMAND_syncRoomCounts') {
        return `Sincronizzazione dei conteggi delle aule eseguita (forzato: ${d.force ? 'Sì' : 'No'})`;
    }
    if (log.action === 'INTEGRITY_COMMAND_recalculateGamificationStats') {
        return `Ricalcolo completo delle statistiche di gamification (XP, Livelli, Amici, Check-in) per tutti gli utenti eseguito con successo.`;
    }
    if (log.action === 'INTEGRITY_COMMAND_purgeGhostUsers') {
        return `Rimozione degli utenti fantasma completata per l'assemblea: ${d.assemblyId}`;
    }
    if (log.action === 'INTEGRITY_COMMAND_forceResetTurn') {
        return `Reset forzato completato per il turno: ${d.turnId} (assemblea: ${d.assemblyId})`;
    }
    if (log.action === 'INTEGRITY_COMMAND_emergencyEject') {
        return `Evacuazione d'emergenza completata per l'aula: ${d.roomId} (assemblea: ${d.assemblyId})`;
    }
    if (log.action === 'WIPE_DATABASE') {
        return `Reset totale del database eseguito. Tutti i dati degli studenti e delle assemblee sono stati rimossi.`;
    }
    
    try {
        return JSON.stringify(d);
    } catch (e) {
        return String(d);
    }
};

export const AuditLog: React.FC<Props> = ({ assemblyId }) => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [searchText, setSearchText] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("ALL");
    const [dateFilter, setDateFilter] = useState<string>("ALL");
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchLogs = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        setLoading(true);
        const constraints = [orderBy("timestamp", "desc"), limit(150)];
        const q = assemblyId
            ? query(collection(db, "audit_log"), where("assemblyId", "==", assemblyId), ...constraints)
            : query(collection(db, "audit_log"), ...constraints);

        const unsubscribe = onSnapshot(q, (snap) => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry)));
            setLastUpdated(new Date());
            setLoading(false);
        }, (error) => {
            console.error("[AuditLog] Error in logs subscription:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [assemblyId, refreshTrigger]);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            const detailsStr = formatDetails(l);
            const matchesSearch = !searchText ||
                detailsStr.toLowerCase().includes(searchText.toLowerCase()) ||
                l.actor.toLowerCase().includes(searchText.toLowerCase()) ||
                auditActionLabel(l.action).toLowerCase().includes(searchText.toLowerCase());

            const matchesAction = actionFilter === "ALL" || l.action === actionFilter;

            const matchesDate = (() => {
                if (dateFilter === "ALL") return true;
                const now = Date.now();
                const dayMs = 24 * 60 * 60 * 1000;
                const logMillis = getTimestampMillis(l.timestamp);
                if (dateFilter === "TODAY") return (now - logMillis) < dayMs;
                if (dateFilter === "WEEK") return (now - logMillis) < (7 * dayMs);
                return true;
            })();

            return matchesSearch && matchesAction && matchesDate;
        });
    }, [logs, searchText, actionFilter, dateFilter]);

    const exportCSV = () => {
        const data = filteredLogs.map(l => ({
            "Azione": auditActionLabel(l.action),
            "Attore": l.actor,
            "Dettagli": formatDetails(l),
            "Assemblea": l.assemblyId || "-",
            "Data/Ora": new Date(getTimestampMillis(l.timestamp)).toLocaleString("it-IT"),
        }));
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (ts: any) => {
        const d = new Date(getTimestampMillis(ts));
        const isToday = d.toDateString() === new Date().toDateString();
        return {
            date: isToday ? "Oggi" : d.toLocaleDateString("it-IT", { day: "2-digit", month: "long" }),
            time: d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
            raw: d.toLocaleString("it-IT")
        };
    };

    return (
        <div className="space-y-8">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-widest italic text-white/90">Registro Attività</h3>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Audit Trail di Sistema</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {lastUpdated && (
                        <div className="text-right hidden sm:block mr-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Ultimo aggiornamento</p>
                            <p className="text-[10px] font-bold text-white/40">{lastUpdated.toLocaleTimeString("it-IT")}</p>
                        </div>
                    )}
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all disabled:opacity-50 group flex items-center justify-center btn-press"
                        title="Aggiorna Registro"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                    <div className="flex-1 lg:flex-none relative group min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Cerca azioni o amministratori..."
                            className="w-full bg-white/3 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium text-sm text-white"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={exportCSV}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all btn-press"
                        title="Esporta Log"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20 mr-2">
                    <Filter className="w-3 h-3" /> Filtra:
                </div>

                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 outline-none focus:border-primary/50 transition-all cursor-pointer"
                >
                    <option value="ALL">Tutte le Azioni</option>
                    {Object.keys(actionConfig).map(action => (
                        <option key={action} value={action}>{auditActionLabel(action as AuditAction)}</option>
                    ))}
                </select>

                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 outline-none focus:border-primary/50 transition-all cursor-pointer"
                >
                    <option value="ALL">Qualsiasi Data</option>
                    <option value="TODAY">Ultime 24 ore</option>
                    <option value="WEEK">Ultima settimana</option>
                </select>

                <div className="ml-auto text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    {filteredLogs.length} risultati
                </div>
            </div>

            {/* Log List */}
            <div className="relative">
                <div className="absolute left-12 top-0 bottom-0 w-px bg-white/5 md:block hidden" />

                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                    {filteredLogs.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-white/2 rounded-full flex items-center justify-center mx-auto border border-white/5">
                                <Search className="w-8 h-8 text-white/10" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-white/40 font-black uppercase tracking-widest text-sm">Nessun log trovato</p>
                                <p className="text-white/10 text-[10px] font-bold uppercase tracking-widest">Prova a cambiare i filtri di ricerca</p>
                            </div>
                        </div>
                    ) : (
                        filteredLogs.map((log, index) => {
                            const { date, time, raw } = formatDate(log.timestamp);
                            const iconConfig = actionConfig[log.action] || { color: "text-white/40 bg-white/5", icon: <Info className="w-4 h-4" /> };

                            return (
                                <div key={log.id} className="group relative pl-0 md:pl-12 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                    {/* Timeline Node */}
                                    <div className="absolute left-10 top-6 w-5 h-5 -translate-x-1/2 rounded-full border-4 border-[#0a0a0b] bg-white/5 md:block hidden group-hover:bg-primary transition-colors duration-300" />

                                    <div className="bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-3xl p-6 transition-all duration-300 hover:bg-white/[0.05] relative overflow-hidden">
                                        {/* Action Icon Background Decor */}
                                        <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity ${iconConfig.color.split(' ')[0]}`}>
                                            {React.cloneElement(iconConfig.icon as React.ReactElement<any>, { className: "w-24 h-24 rotate-12" })}
                                        </div>

                                        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                                            {/* Left Info: Icon & Time */}
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconConfig.color}`}>
                                                    {iconConfig.icon}
                                                </div>
                                                <div className="md:hidden">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">{date}</div>
                                                    <div className="text-lg font-black text-white">{time}</div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${iconConfig.color.split(' ')[0]}`}>
                                                        {auditActionLabel(log.action)}
                                                    </span>
                                                    <div className="h-1 w-1 rounded-full bg-white/10" />
                                                    <div className="flex items-center gap-1.5 text-white/30 truncate">
                                                        <User className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest truncate">{log.actor}</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-white/80 leading-relaxed max-w-2xl">
                                                    {formatDetails(log)}
                                                </p>
                                            </div>

                                            {/* Desktop Time */}
                                            <div className="hidden md:block text-right shrink-0">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-primary/60 transition-colors uppercase">{date}</div>
                                                <div className="text-xl font-black text-white group-hover:scale-105 transition-transform origin-right">{time}</div>
                                            </div>

                                            <button className="md:hidden absolute top-6 right-6 p-2 text-white/10 hover:text-white transition-colors" title={raw}>
                                                <Info className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="pt-8 flex items-center justify-center">
                <div className="px-6 py-2 bg-white/2 border border-white/5 rounded-full flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Tempo Reale</span>
                    </div>
                    <div className="h-4 w-px bg-white/5" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Mostrando gli ultimi 150 eventi</span>
                </div>
            </div>
        </div>
    );
};
