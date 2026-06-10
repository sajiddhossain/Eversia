import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot, setDoc, updateDoc, getDocs } from "firebase/firestore";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ActivityManager } from "./ActivityManager";
import { AuditLog } from "./AuditLog";
import { StudentManager } from "./StudentManager";
import { LogisticsManager } from "./LogisticsManager";
import { RoleManager } from "./RoleManager";
import { StaffAttendance } from "./StaffAttendance";
import { AssemblyTemplates } from "./AssemblyTemplates";
import { ActivityImportExport } from "./ActivityImportExport";
import { NotificationCenter } from "../Staff/NotificationCenter";
import { useIntegrityEngine } from "../../hooks/useIntegrityEngine";

// Dashboard widgets
import { AdminMetrics } from "./AdminDashboard/AdminMetrics";
import { AdminLiveMonitor } from "./AdminDashboard/AdminLiveMonitor";
import { AdminReports } from "./AdminDashboard/AdminReports";
import { AdminVisuals } from "./AdminDashboard/AdminVisuals";
import { AdminRoomTable } from "./AdminDashboard/AdminRoomTable";

// Modals
import { StudentManagerModal } from "./AdminDashboard/StudentManagerModal";
import { ActivityAnalytics } from "./ActivityAnalytics";
import { StudentLocator } from "./StudentLocator";
import { CheckinTimeline } from "../Student/CheckinTimeline";
import { ActivityRanking } from "./ActivityRanking";
import { AssemblyComparison } from "./AssemblyComparison";
import { RoomManagerStats } from "../Staff/RoomManager/RoomManagerStats";
import { AdvancedExportModal } from "./AdvancedExportModal";

import { 
    Settings, Database, Users, Shield, MapPin, Loader2, 
    FileText, Download, Copy, Calendar, Link2, 
    Clock, Mail, ArrowLeft, Terminal, RotateCcw, Lock, Unlock,
    LayoutDashboard, Check, UserCheck, History
} from "lucide-react";
import type { Assembly, Activity, AppConfig, Student, UserProfile } from '../../types';
import { formatDateToISO, formatDateToIT } from "../../utils/dateUtils";
import { collection, query, where, onSnapshot as onSnapshotFirestore } from "firebase/firestore";
import { logAudit } from "../../utils/auditLogger";
import { useAuth } from '../../hooks/useAuth';

type Tab = 'monitor' | 'activities' | 'students' | 'logistics' | 'roles' | 'staff' | 'communications' | 'info' | 'logs';

export const AssemblyConfig: React.FC = () => {
    const { userProfile } = useAuth();
    const { assemblyId } = useParams<{ assemblyId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'monitor');
    const [assemblyData, setAssemblyData] = useState<Assembly | null>(null);
    const [configData, setConfigData] = useState<AppConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showImportExport, setShowImportExport] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [assembliesList, setAssembliesList] = useState<Assembly[]>([]);
    const [isRefreshingStudents, setIsRefreshingStudents] = useState(false);
    const [lastUpdatedStudents, setLastUpdatedStudents] = useState<Date | null>(null);
    
    const [localName, setLocalName] = useState("");
    const [localDescription, setLocalDescription] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);

    useEffect(() => {
        if (assemblyData) {
            if (!isEditingName) {
                setLocalName(assemblyData.name || "");
            }
            if (!isEditingDesc) {
                setLocalDescription(assemblyData.description || "");
            }
        }
    }, [assemblyData, isEditingName, isEditingDesc]);

    // Live monitor Modals states
    const [showVagabondi, setShowVagabondi] = useState(false);
    const [showStudentLocator, setShowStudentLocator] = useState(false);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showActivityRanking, setShowActivityRanking] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    const [showRMStats, setShowRMStats] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [analyticsViewId, setAnalyticsViewId] = useState<string | null>(null);

    const [showTerminalLogs, setShowTerminalLogs] = useState(false);
    const logScrollRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const [copiedInvite, setCopiedInvite] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [copiedDetailInvite, setCopiedDetailInvite] = useState(false);

    const {
        logs,
        isExecuting: isIntegrityRunning,
        syncRoomCounts,
        purgeGhostUsers,
        toggleRegistrations,
        verifyInventory,
        recalculateGamificationStats,
        repairAll,
        clearLogs,
        addLog
    } = useIntegrityEngine();

    const fetchStudents = React.useCallback(async () => {
        if (!assemblyId) return;
        setIsRefreshingStudents(true);
        try {
            const qStudents = query(collection(db, "students"), where("assemblyId", "==", assemblyId));
            const snapshot = await getDocs(qStudents);
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
            setLastUpdatedStudents(new Date());
        } catch (error) {
            console.error("Error fetching students statically:", error);
        } finally {
            setIsRefreshingStudents(false);
        }
    }, [assemblyId]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // Auto-scroll logs
    useEffect(() => {
        if (logScrollRef.current) {
            logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
        }
    }, [logs]);

    useEffect(() => {
        if (!assemblyId) return;

        const unsubAssembly = onSnapshot(doc(db, "assemblies", assemblyId), (docSnap) => {
            if (docSnap.exists()) {
                setAssemblyData({ id: docSnap.id, ...docSnap.data() } as Assembly);
            }
        });

        const unsubConfig = onSnapshot(doc(db, "config", "main"), (docSnap) => {
            if (docSnap.exists()) {
                setConfigData(docSnap.data() as AppConfig);
            }
        });

        const qActivities = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
        const unsubActivities = onSnapshotFirestore(qActivities, (snapshot) => {
            setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
        });

        const qUsers = query(
            collection(db, "users"),
            where("role", "in", ["ADMIN", "SVILUPPATORE", "ROOM_MANAGER", "SECURITY"])
        );
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
        });

        const unsubAssemblies = onSnapshotFirestore(collection(db, "assemblies"), (snapshot) => {
            setAssembliesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assembly)));
        });

        return () => {
            unsubAssembly();
            unsubConfig();
            unsubActivities();
            unsubUsers();
            unsubAssemblies();
        };
    }, [assemblyId]);

    const getDetailedAssemblyUpdatesDescription = (updates: Partial<Assembly>): string => {
        const parts: string[] = [];
        
        if (updates.status) {
            const statusLabels: Record<string, string> = {
                'CHIUSO': 'In Preparazione',
                'ISCRIZIONI_APERTE': 'Iscrizioni Aperte',
                'ATTIVA': 'Live Event (Assemblea in Corso)',
                'ARCHIVIATA': 'Archiviata (Evento Completato)'
            };
            parts.push(`Stato dell'evento modificato in: "${statusLabels[updates.status] || updates.status}"`);
        }
        
        if (updates.name) {
            parts.push(`Titolo dell'assemblea modificato in: "${updates.name}"`);
        }
        
        if (updates.date) {
            parts.push(`Data dell'evento modificata in: ${updates.date}`);
        }
        
        if (updates.themeColor) {
            parts.push(`Colore del tema modificato in: ${updates.themeColor}`);
        }
        
        if (updates.description !== undefined) {
            const descExcerpt = updates.description 
                ? (updates.description.length > 50 ? updates.description.slice(0, 50) + "..." : updates.description)
                : "nessuna descrizione";
            parts.push(`Descrizione modificata in: "${descExcerpt}"`);
        }
        
        if (updates.turn_schedules) {
            const schedulesStr = Object.entries(updates.turn_schedules)
                .map(([tId, times]) => `Turno ${tId} (${times.start || '--:--'} - ${times.end || '--:--'})`)
                .join(', ');
            parts.push(`Aggiornati orari turni: ${schedulesStr}`);
        }

        if (parts.length === 0) {
            return `Aggiornati parametri assemblea: ${Object.keys(updates).join(', ')}`;
        }
        
        return parts.join(' | ');
    };

    const handleUpdateAssembly = async (updates: Partial<Assembly>) => {
        if (!assemblyId) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "assemblies", assemblyId), updates, { merge: true });
            if (updates.status) {
                const statusLabels: Record<string, string> = {
                    'CHIUSO': 'In Preparazione',
                    'ISCRIZIONI_APERTE': 'Iscrizioni Aperte',
                    'ATTIVA': 'Live Event',
                    'ARCHIVIATA': 'Archiviata'
                };
                addLog(`Stato dell'evento modificato in: ${statusLabels[updates.status] || updates.status}`, 'SUCCESS');
            }
            if (updates.name) {
                addLog(`Titolo dell'assemblea modificato in: "${updates.name}"`, 'INFO');
            }
            if (updates.date) {
                addLog(`Data dell'evento modificata in: ${updates.date}`, 'INFO');
            }
            if (updates.themeColor) {
                addLog(`Colore del tema modificato in: ${updates.themeColor}`, 'INFO');
            }
            await logAudit('ASSEMBLY_UPDATED', userProfile?.email || 'System', getDetailedAssemblyUpdatesDescription(updates), assemblyId);
        } catch (error) {
            addLog(`Errore aggiornamento parametri assemblea: ${error}`, 'ERROR');
            console.error("Error updating assembly:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetTurn = async (turn: string) => {
        try {
            await updateDoc(doc(db, "config", "main"), { currentTurn: turn });
            const turnLabel = turn === 'ALL' ? 'Tutti i Turni (ALL)' : `Turno T${turn}`;
            addLog(`Turno attivo globale cambiato in: ${turnLabel}`, 'SUCCESS');
            await logAudit('PHASE_CHANGED', userProfile?.email || 'System', `Cambio turno attivo globale in: ${turnLabel}`, assemblyId);
        } catch (e) {
            addLog(`Errore cambio turno: ${e}`, 'ERROR');
            console.error("Error setting turn:", e);
        }
    };

    const handleToggleRegistrations = async (enabled: boolean) => {
        try {
            await toggleRegistrations(enabled, assemblyId);
        } catch (e) {
            addLog(`Errore salvataggio stato registrazioni: ${e}`, 'ERROR');
            console.error("Error toggling registrations:", e);
        }
    };

    if (!assemblyId) return null;

    const currentTurn = configData?.currentTurn || "1";
    const registrationsLocked = configData?.lock_registrations || false;

    // Filter out staff-only documents from student metrics
    const adminEmails = React.useMemo(() => {
        return new Set(allUsers
            .filter(u => ['ADMIN', 'SVILUPPATORE'].includes(u.role))
            .map(u => u.email?.toLowerCase().trim())
            .filter(Boolean)
        );
    }, [allUsers]);

    const actualStudents = React.useMemo(() => students.filter(s => {
        const emailClean = s.email.toLowerCase().trim();
        if (adminEmails.has(emailClean)) return false;

        const hasSchedule = Object.keys(s.scheduled_turns || {}).length > 0;
        if (hasSchedule) return true; // Has enrollments = definitely a student
        
        // Exclude if it has staff actual location entries (staff-only)
        const hasStaffPresence = s.staff_actual_location && Object.keys(s.staff_actual_location).length > 0;
        if (hasStaffPresence) return false;
        
        // Backwards compatibility: exclude if ALL locations in actual_location are STAFF
        const locValues = Object.values(s.actual_location || {});
        if (locValues.length > 0) {
            const allStaff = locValues.every((loc: any) => loc?.activity_id === 'STAFF');
            if (allStaff) return false;
        }
        
        return true;
    }), [students, adminEmails]);

    const totalStudents = actualStudents.length;

    // Calculate metrics locally for the viewed assembly
    const metrics = React.useMemo(() => {
        const nonEnrolled: Student[] = [];
        const absents: Student[] = [];
        const presents: Student[] = [];
        const imbucati: Student[] = [];

        actualStudents.forEach(s => {
            const locValues = Object.values(s.actual_location || {});
            const isPresent = locValues.some((loc: any) => loc?.checked_in === true);
            const hasSchedule = Object.keys(s.scheduled_turns || {}).length > 0;

            if (isPresent) {
                presents.push(s);
                const isImbucato = Object.entries(s.actual_location || {}).some(([turnId, loc]: [string, any]) => {
                    if (!loc?.checked_in || !loc?.activity_id || loc.activity_id === 'STAFF') return false;
                    const expectedActivity = s.scheduled_turns?.[turnId];
                    return expectedActivity && loc.activity_id !== expectedActivity;
                });
                if (isImbucato) imbucati.push(s);
            } else if (!hasSchedule) {
                nonEnrolled.push(s);
            } else {
                absents.push(s);
            }
        });

        return { nonEnrolled, absents, presents, imbucati };
    }, [actualStudents]);

    const totalCapacity = React.useMemo(() => activities.reduce((acc, curr) => {
        if (currentTurn === 'ALL') {
            return acc + (curr.max_capacity * (curr.turn_ids?.length || 0));
        }
        return acc + (curr.turn_ids?.includes(currentTurn) ? curr.max_capacity : 0);
    }, 0), [activities, currentTurn]);

    const actualPresent = React.useMemo(() => activities.reduce((acc, curr) => {
        if (currentTurn === 'ALL') {
            return acc + Object.values(curr.counts_by_turn || {}).reduce((a, b) => a + b, 0);
        }
        return acc + (curr.counts_by_turn?.[currentTurn] || 0);
    }, 0), [activities, currentTurn]);

    const avgSaturation = totalCapacity > 0 ? (actualPresent / totalCapacity) * 100 : 0;
    const efficiency = totalStudents > 0 ? (metrics.presents.length / totalStudents) * 100 : 0;
    const pendingTotal = Math.max(0, totalStudents - metrics.presents.length);

    const studentsInCurrentTurn = React.useMemo(() => students.filter(s => {
        if (currentTurn === 'ALL') return Object.keys(s.scheduled_turns || {}).length > 0;
        return s.scheduled_turns && s.scheduled_turns[currentTurn];
    }), [students, currentTurn]);
    
    const studentsMissingAssignment = Math.max(0, totalStudents - studentsInCurrentTurn.length);

    // Chart Configuration
    const chartData = React.useMemo(() => ({
        labels: activities.map(r => (r.name || "Senza Nome").substring(0, 15) + ((r.name || "").length > 15 ? "..." : "")),
        datasets: [
            {
                label: 'Studenti Attivi',
                data: activities.map(r => {
                    if (currentTurn === 'ALL') {
                        return Object.values(r.counts_by_turn || {}).reduce((a: number, b: number) => a + b, 0);
                    }
                    return r.counts_by_turn?.[currentTurn] || 0;
                }),
                backgroundColor: activities.map(r => {
                    const count = currentTurn === 'ALL'
                        ? Object.values(r.counts_by_turn || {}).reduce((a: number, b: number) => a + b, 0)
                        : (r.counts_by_turn?.[currentTurn] || 0);
                    const cap = currentTurn === 'ALL'
                        ? r.max_capacity * (r.turn_ids?.length || 0)
                        : r.max_capacity;

                    const ratio = count / (cap || 1);
                    if (ratio >= 1) return 'rgba(239, 68, 68, 0.7)';
                    if (ratio >= 0.8) return 'rgba(245, 158, 11, 0.7)';
                    return 'rgba(34, 197, 94, 0.7)';
                }),
                borderRadius: 8,
            },
            {
                label: 'Posti Liberi',
                data: activities.map(r => {
                    const count = currentTurn === 'ALL'
                        ? Object.values(r.counts_by_turn || {}).reduce((a: number, b: number) => a + b, 0)
                        : (r.counts_by_turn?.[currentTurn] || 0);
                    const cap = currentTurn === 'ALL'
                        ? r.max_capacity * (r.turn_ids?.length || 0)
                        : r.max_capacity;
                    return Math.max(0, cap - count);
                }),
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 8,
            }
        ],
    }), [activities, currentTurn]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                stacked: true,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } }
            },
            x: {
                stacked: true,
                grid: { display: false },
                ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1a1a1a',
                titleColor: '#fff',
                bodyColor: '#ccc',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: false
            }
        }
    };

    const tabs = [
        { id: 'monitor' as const, label: 'Monitor Live', icon: LayoutDashboard, description: 'Stato aule, grafici, presenze' },
        { id: 'activities' as const, label: 'Attività', icon: Database, description: 'Catalogo temi ed aule' },
        { id: 'students' as const, label: 'Studenti & Presenze', icon: Users, description: 'Anagrafica, registri, timeline' },
        { id: 'logistics' as const, label: 'Logistica', icon: MapPin, description: 'Mappatura aule fisiche' },
        { id: 'roles' as const, label: 'Ruoli & Deleghe', icon: Shield, description: 'Deleghe dello staff' },
        { id: 'staff' as const, label: 'Presenze Staff', icon: UserCheck, description: 'Check-in dello staff' },
        { id: 'communications' as const, label: 'Comunicazioni', icon: Mail, description: 'Notifiche e broadcast' },
        { id: 'info' as const, label: 'Impostazioni & Turni', icon: Settings, description: 'Metadata ed orari turni' },
        { id: 'logs' as const, label: 'Registro Log', icon: History, description: 'Tracciamento attività assemblea' },
    ];
    const themeColor = assemblyData?.themeColor || "#0082e6";
    const ccoAnomalies = metrics.imbucati.length + studentsMissingAssignment;

    return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/30 relative overflow-hidden -mt-20 pt-32 pb-24">
            {/* Background glows */}
            <div 
                className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-all duration-700" 
                style={{ backgroundColor: `${themeColor}08` }}
            />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10 animate-in fade-in duration-700">
                {/* Header Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/admin')}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-white/40 hover:text-white"
                            title="Torna alla Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                                <span>EVERSIA CONTROL</span>
                                <span>•</span>
                                <span style={{ color: themeColor }}>GESTIONE ASSEMBLEA</span>
                            </div>
                            <h1 className="text-2xl font-black uppercase tracking-tight mt-0.5">
                                {assemblyData?.name || "Caricamento Evento..."}
                            </h1>
                        </div>
                    </div>
                    {assemblyData && (
                        <div className="flex items-center gap-3 self-start sm:self-center">
                            <span 
                                className="px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
                                style={{
                                    borderColor: `${themeColor}30`,
                                    color: themeColor,
                                    backgroundColor: `${themeColor}08`,
                                    boxShadow: `0 0 15px ${themeColor}10`
                                }}
                            >
                                ID: {assemblyData.id}
                            </span>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 backdrop-blur-md">
                                {lastUpdatedStudents && (
                                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                                        Dati: {lastUpdatedStudents.toLocaleTimeString()}
                                    </span>
                                )}
                                <button
                                    onClick={fetchStudents}
                                    disabled={isRefreshingStudents}
                                    className="p-1 text-white/40 hover:text-white transition-all disabled:opacity-50"
                                    title="Aggiorna Studenti"
                                >
                                    <RotateCcw className={`w-3 h-3 ${isRefreshingStudents ? 'animate-spin' : 'hover:scale-110 transition-transform'}`} />
                                </button>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Live Sync (Config)</span>
                        </div>
                    )}
                </div>

                {/* Stats HUD (Futuristic Ticker) */}
                {assemblyData && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        {/* Stat 1: Total Enrolled */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-md hover:border-white/10 transition-all duration-300">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Studenti Totali</span>
                                <p className="text-2xl font-black mt-1 text-white">{totalStudents}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 border border-white/10">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Stat 2: Presence Rate */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-md hover:border-white/10 transition-all duration-300">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Presenza Live</span>
                                <p className="text-2xl font-black mt-1 text-white">{Math.round(efficiency)}%</p>
                            </div>
                            <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300"
                                style={{
                                    backgroundColor: `${themeColor}08`,
                                    borderColor: `${themeColor}20`,
                                    color: themeColor
                                }}
                            >
                                <Check className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Stat 3: Avg Saturation */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-md hover:border-white/10 transition-all duration-300">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Saturazione Spazi</span>
                                <p className="text-2xl font-black mt-1 text-white">{Math.round(avgSaturation)}%</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <MapPin className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Stat 4: CCO Anomalies */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-md hover:border-white/10 transition-all duration-300">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Anomalie Rilevate</span>
                                <p className={`text-2xl font-black mt-1 ${ccoAnomalies > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>{ccoAnomalies}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                                ccoAnomalies > 0 
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] animate-pulse' 
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                                <Shield className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Level Control Dashboard */}
                {assemblyData && (() => {
                    const STATES = [
                        { id: 'CHIUSO', label: 'In Preparazione', desc: 'In Allestimento', icon: Settings, activeColor: 'border-current bg-[#09090b]' },
                        { id: 'ISCRIZIONI_APERTE', label: 'Iscrizioni', desc: 'Aperte a Tutti', icon: Users, activeColor: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
                        { id: 'ATTIVA', label: 'Live Event', desc: 'Assemblea in Corso', icon: Shield, activeColor: 'text-primary border-primary/25 bg-primary/5 shadow-[0_0_15px_rgba(226,243,60,0.15)]' },
                        { id: 'ARCHIVIATA', label: 'Archiviata', desc: 'Event Completato', icon: FileText, activeColor: 'text-amber-400 border-amber-500/25 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]' }
                    ];

                    return (
                        <div 
                            className="bg-white/[0.02] border rounded-[2.5rem] p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 shadow-2xl backdrop-blur-md transition-all duration-500"
                            style={{ 
                                borderColor: `${themeColor}15`, 
                                boxShadow: `0 0 50px ${themeColor}05`
                            }}
                        >
                            {/* 1. Status Controls */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between ml-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Stato dell'Evento</h3>
                                </div>
                                
                                <div className="space-y-2 bg-black/20 rounded-[2rem] border border-white/5 p-4 flex flex-col justify-center min-h-[140px]">
                                    {STATES.map((state) => {
                                        const isSelected = assemblyData.status === state.id;
                                        const IconComponent = state.icon;
                                        
                                        // Customize active style dynamically based on theme color
                                        let borderClass = 'border-white/5 hover:border-white/10 hover:bg-white/[0.01]';
                                        let bgClass = 'bg-white/[0.01]';
                                        let textClass = 'text-white/40';
                                        let iconBgClass = 'bg-white/5 text-white/40 border-white/10';
                                        let glowStyle = {};

                                        if (isSelected) {
                                            bgClass = 'bg-white/[0.03]';
                                            textClass = 'text-white';
                                            if (state.id === 'CHIUSO') {
                                                borderClass = 'border-white/20';
                                                iconBgClass = 'bg-white/10 text-white border-white/20';
                                                glowStyle = { boxShadow: '0 0 15px rgba(255,255,255,0.05)' };
                                            } else if (state.id === 'ISCRIZIONI_APERTE') {
                                                borderClass = 'border-emerald-500/20';
                                                iconBgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                                glowStyle = { boxShadow: '0 0 15px rgba(16,185,129,0.1)' };
                                            } else if (state.id === 'ATTIVA') {
                                                borderClass = `border-[rgba(226,243,60,0.2)]`; 
                                                iconBgClass = `bg-primary/10 text-primary border-primary/20`;
                                                glowStyle = { boxShadow: `0 0 15px rgba(226,243,60,0.1)` };
                                            } else if (state.id === 'ARCHIVIATA') {
                                                borderClass = 'border-amber-500/20';
                                                iconBgClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                                                glowStyle = { boxShadow: '0 0 15px rgba(245,158,11,0.1)' };
                                            }
                                        }

                                        return (
                                            <button
                                                key={state.id}
                                                onClick={() => handleUpdateAssembly({ status: state.id as any })}
                                                className={`w-full text-left p-3 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-300 active:scale-[0.98] ${bgClass} ${borderClass}`}
                                                style={isSelected ? glowStyle : {}}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* State Icon */}
                                                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-300 relative shrink-0 ${iconBgClass}`}>
                                                        <IconComponent className="w-3.5 h-3.5" />
                                                        {state.id === 'ATTIVA' && isSelected && (
                                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Text Info */}
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-wider leading-none ${textClass}`}>
                                                            {state.label}
                                                        </p>
                                                        <p className="text-[7.5px] text-white/20 font-bold uppercase tracking-wider mt-1.5 leading-none">
                                                            {state.desc}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Selection Badge / Radio Indicator */}
                                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0 ${
                                                    isSelected 
                                                        ? 'border-primary/50 bg-primary/5' 
                                                        : 'border-white/10'
                                                }`}>
                                                    {isSelected && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Global Turn Controls */}
                            <div className="space-y-4 border-t lg:border-t-0 lg:border-x border-white/5 lg:px-8 pt-6 lg:pt-0 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Fase / Turno Attivo Globale</h3>
                                        <span 
                                            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                                            style={{
                                                backgroundColor: `${themeColor}10`,
                                                borderColor: `${themeColor}30`,
                                                color: themeColor
                                            }}
                                        >
                                            {currentTurn === 'ALL' ? 'Tutti' : 'T' + currentTurn}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                        {["1", "2", "3", "ALL"].map(t => {
                                            const isSelectedTurn = currentTurn === t;
                                            return (
                                                <button
                                                    key={t}
                                                    onClick={() => handleSetTurn(t)}
                                                    className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all btn-press ${
                                                        isSelectedTurn 
                                                            ? "" 
                                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                                    }`}
                                                    style={isSelectedTurn ? {
                                                        backgroundColor: themeColor,
                                                        color: '#000000',
                                                        boxShadow: `0 0 15px ${themeColor}30`
                                                    } : {}}
                                                >
                                                    {t === 'ALL' ? 'ALL' : `T${t}`}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* System Registration Lock Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 mt-4">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black uppercase tracking-wider">Nuove Registrazioni</p>
                                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-wider">{registrationsLocked ? 'Bloccate' : 'Aperte'}</p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleRegistrations(registrationsLocked)}
                                            className={`p-2.5 rounded-xl transition-all border btn-press ${registrationsLocked 
                                                ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}
                                            title={registrationsLocked ? 'Sblocca Registrazioni' : 'Blocca Registrazioni'}
                                        >
                                            {registrationsLocked ? <Lock className="w-4 h-4 animate-in zoom-in duration-200" /> : <Unlock className="w-4 h-4 animate-in zoom-in duration-200" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Copy Invite Link */}
                                <div className="pt-4 lg:pt-0 mt-4">
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/join/${assemblyId}`;
                                            navigator.clipboard.writeText(url);
                                            setCopiedInvite(true);
                                            setTimeout(() => setCopiedInvite(false), 2000);
                                        }}
                                        className={`w-full py-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest btn-press ${
                                            copiedInvite 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                                : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        {copiedInvite ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 animate-in zoom-in duration-300" /> Copiato!
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="w-3.5 h-3.5" /> Copia Link di Invito
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* 3. System Integrity Actions */}
                            <div className="space-y-4 pt-6 lg:pt-0">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Strumenti di Integrità CCO</h3>
                                    <button
                                        onClick={() => setShowTerminalLogs(!showTerminalLogs)}
                                        className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${showTerminalLogs 
                                            ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                                            : 'bg-white/5 border-white/5 text-white/40 hover:text-white'}`}
                                    >
                                        <Terminal className="w-3 h-3" /> Console Logs
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                     <button
                                         onClick={() => repairAll(assemblyId)}
                                         disabled={isIntegrityRunning}
                                         className="col-span-2 py-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 btn-press"
                                     >
                                         <RotateCcw className="w-3.5 h-3.5" /> Risolvi Tutto
                                     </button>
                                     <button
                                         onClick={() => syncRoomCounts(true)}
                                         disabled={isIntegrityRunning}
                                         className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 border border-white/5 btn-press"
                                     >
                                         Riallinea Posti
                                     </button>
                                     <button
                                         onClick={() => purgeGhostUsers(assemblyId)}
                                         disabled={isIntegrityRunning}
                                         className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 border border-white/5 btn-press"
                                     >
                                         Pulisci Fantasma
                                     </button>
                                     <button
                                         onClick={() => verifyInventory(assemblyId)}
                                         disabled={isIntegrityRunning}
                                         className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 border border-white/5 btn-press"
                                     >
                                         Verifica Capienza
                                     </button>
                                     <button
                                         onClick={() => recalculateGamificationStats()}
                                         disabled={isIntegrityRunning}
                                         className="py-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 btn-press"
                                     >
                                         Ricalcola Gamification
                                     </button>
                                 </div>

                                {/* Floating diagnostic console */}
                                {showTerminalLogs && (
                                    <div className="animate-in slide-in-from-top-4 duration-300 mt-3">
                                        <div className="bg-[#020204] border-2 border-emerald-500/25 rounded-2xl overflow-hidden shadow-2xl relative cco-terminal-glow">
                                            {/* Terminal Header */}
                                            <div className="flex items-center justify-between px-4 py-2 bg-emerald-950/20 border-b border-emerald-500/10">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]" />
                                                    <span className="text-[7.5px] text-emerald-400 font-mono font-black uppercase tracking-[0.2em] cco-neon-text">Live Integrity Diagnostics</span>
                                                </div>
                                                <button
                                                    onClick={clearLogs}
                                                    className="text-[7px] text-emerald-400/50 hover:text-emerald-300 font-mono font-black uppercase tracking-wider hover:bg-emerald-500/10 px-2 py-0.5 rounded transition-all"
                                                >
                                                    Pulisci Console
                                                </button>
                                            </div>
                                            {/* CRT Scanline Overlay */}
                                            <div className="absolute inset-0 pointer-events-none cco-scanline opacity-30 z-10" />
                                            
                                            {/* Logs Area */}
                                            <div 
                                                ref={logScrollRef}
                                                className="h-32 overflow-y-auto p-4 font-mono text-[8px] text-emerald-400/80 space-y-2.5 custom-scrollbar relative shadow-inner"
                                            >
                                                {logs.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center pt-8 text-emerald-500/20 space-y-1">
                                                        <p className="italic font-bold text-[8.5px]">CONSOLE IDLE</p>
                                                        <p className="text-[7px] tracking-wide">DIGITARE UN COMANDO PER INIZIARE</p>
                                                    </div>
                                                ) : logs.map((log, i) => (
                                                    <div key={i} className="flex items-start gap-2 leading-relaxed border-b border-white/[0.02] pb-1.5 text-[7.5px]">
                                                        <span className="text-emerald-500/30 shrink-0 select-none font-bold">[{log.timestamp}]</span>
                                                        <span className={`shrink-0 text-[6.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none ${
                                                            log.type === 'ERROR' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' :
                                                            log.type === 'WARN' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                            log.type === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]' : 
                                                            'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                                        }`}>
                                                            {log.type}
                                                        </span>
                                                        <span className="text-emerald-300/80 font-medium">{log.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Bottom Section - Navigation Tabs and Content */}
                <div 
                    className="bg-white/[0.01] border rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl transition-all duration-500"
                    style={{ borderColor: `${themeColor}10`, boxShadow: `0 0 50px ${themeColor}02` }}
                >
                    {/* Horizontal tab list */}
                    <div className="flex gap-2 border-b border-white/5 p-4 overflow-x-auto bg-black/20 scrollbar-hide">
                        {tabs.map((tab) => {
                            const isSelected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all group whitespace-nowrap btn-press ${
                                        isSelected ? "" : "hover:bg-white/5 text-white/40 hover:text-white"
                                    }`}
                                    style={isSelected ? {
                                        backgroundColor: themeColor,
                                        color: '#000000',
                                        boxShadow: `0 4px 15px ${themeColor}25`
                                    } : {}}
                                >
                                    <tab.icon className={`w-4 h-4 ${isSelected ? '' : 'group-hover:scale-110 transition-transform'}`} />
                                    <div className="text-left">
                                        <p className="text-[9px] font-black uppercase tracking-wider">{tab.label}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content View Area */}
                    <div className="flex-1 bg-black/10">
                        {activeTab === 'monitor' && (
                            <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                                <AdminMetrics
                                    efficiency={efficiency}
                                    presentStudentsCount={metrics.presents.length}
                                    avgSaturation={avgSaturation}
                                    actualPresent={actualPresent}
                                    pendingTotal={pendingTotal}
                                    activitiesCount={activities.length}
                                    onOpenPending={() => setShowVagabondi(true)}
                                />

                                <AdminLiveMonitor
                                    onOpenStudentLocator={() => setShowStudentLocator(true)}
                                    onOpenTimeline={() => setShowTimeline(true)}
                                    onOpenImbucati={() => setShowVagabondi(true)}
                                    onOpenActivityRanking={() => setShowActivityRanking(true)}
                                />

                                <AdminReports
                                    onOpenComparison={() => setShowComparison(true)}
                                    onOpenRMStats={() => setShowRMStats(true)}
                                    onOpenExport={() => setShowExportModal(true)}
                                />

                                <AdminVisuals
                                    chartContainerRef={chartContainerRef}
                                    chartData={chartData}
                                    chartOptions={chartOptions}
                                    activities={activities}
                                    config={{ activeAssemblyId: assemblyId, currentTurn }}
                                    pendingTotal={pendingTotal}
                                    totalStudents={totalStudents}
                                    studentsMissingAssignment={studentsMissingAssignment}
                                    studentsInCurrentTurn={studentsInCurrentTurn}
                                />

                                <AdminRoomTable
                                    activities={activities}
                                    config={{ activeAssemblyId: assemblyId, currentTurn }}
                                    onOpenAnalytics={setAnalyticsViewId}
                                />
                            </div>
                        )}

                        {activeTab === 'activities' && (
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowImportExport(true)}
                                        className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center gap-2.5 transition-all font-black text-[9px] uppercase tracking-widest border border-white/5"
                                    >
                                        <Download className="w-3.5 h-3.5 text-primary" /> Import/Export CSV
                                    </button>
                                    <button
                                        onClick={() => setShowTemplates(true)}
                                        className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center gap-2.5 transition-all font-black text-[9px] uppercase tracking-widest border border-white/5"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-primary" /> Gestione Template
                                    </button>
                                </div>
                                <ActivityManager assemblyId={assemblyId} onClose={() => { }} />
                            </div>
                        )}

                        {activeTab === 'students' && (
                            <div className="p-6 md:p-8">
                                <StudentManager assemblyId={assemblyId} onClose={() => { }} />
                            </div>
                        )}

                        {activeTab === 'logistics' && (
                            <div className="p-6 md:p-8">
                                <LogisticsManager assemblyId={assemblyId} />
                            </div>
                        )}

                        {activeTab === 'roles' && (
                            <div className="p-6 md:p-8">
                                <RoleManager assemblyId={assemblyId} />
                            </div>
                        )}

                        {activeTab === 'staff' && (
                            <div className="p-6 md:p-8">
                                <StaffAttendance assemblyId={assemblyId} />
                            </div>
                        )}

                        {activeTab === 'communications' && assemblyData && (
                            <div className="p-6 md:p-8">
                                <NotificationCenter assembly={assemblyData} />
                            </div>
                        )}

                        {activeTab === 'info' && assemblyData && (
                            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-300">
                                {/* Details Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Titolo Assemblea</label>
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-lg font-black outline-none focus:border-primary/50 transition-all font-sans"
                                                    value={localName}
                                                    onFocus={() => setIsEditingName(true)}
                                                    onChange={e => setLocalName(e.target.value)}
                                                    onBlur={() => {
                                                        setIsEditingName(false);
                                                        if (localName !== assemblyData?.name) {
                                                            handleUpdateAssembly({ name: localName });
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="w-full md:w-64 space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">ID Univoco</label>
                                                <div className="relative group">
                                                    <input
                                                        readOnly
                                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-black tracking-widest text-primary/60 outline-none font-mono"
                                                        value={assemblyData.id}
                                                    />
                                                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(assemblyData.id);
                                                            setCopiedId(true);
                                                            setTimeout(() => setCopiedId(false), 2000);
                                                        }}
                                                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                                                            copiedId ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/10 text-white/40 hover:text-white'
                                                        }`}
                                                        title="Copia ID"
                                                    >
                                                        {copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Descrizione</label>
                                            <textarea
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all min-h-[100px] font-sans"
                                                value={localDescription}
                                                onFocus={() => setIsEditingDesc(true)}
                                                onChange={e => setLocalDescription(e.target.value)}
                                                onBlur={() => {
                                                    setIsEditingDesc(false);
                                                    if (localDescription !== (assemblyData?.description || "")) {
                                                        handleUpdateAssembly({ description: localDescription });
                                                    }
                                                }}
                                                placeholder="Aggiungi una descrizione per questo evento..."
                                            />
                                        </div>
                                    </div>

                                    {/* Invite / Info Summary card */}
                                    <div className="bg-primary/5 flex flex-col justify-center border border-primary/20 rounded-[2rem] p-6 space-y-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2.5 bg-primary/20 rounded-xl text-primary shrink-0">
                                                <Link2 className="w-4.5 h-4.5" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Link di Invito</span>
                                        </div>
                                        <div className="bg-black/60 rounded-xl p-4 border border-primary/10 flex items-center gap-3 hover:border-primary/35 transition-all overflow-hidden font-sans">
                                            <span className="text-[9px] font-mono text-primary/80 flex-1 truncate">{window.location.origin}/join/{assemblyData.id}</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/join/${assemblyData.id}`);
                                                    setCopiedDetailInvite(true);
                                                    setTimeout(() => setCopiedDetailInvite(false), 2000);
                                                }}
                                                className={`p-2 rounded-lg transition-all shrink-0 group ${
                                                    copiedDetailInvite ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/10 hover:bg-primary/20 text-primary'
                                                }`}
                                            >
                                                {copiedDetailInvite ? (
                                                    <Check className="w-4 h-4 animate-in zoom-in duration-300" />
                                                ) : (
                                                    <Copy className="w-4 h-4 group-hover:scale-105 transition-transform" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-[8px] text-primary/45 font-bold uppercase tracking-widest leading-normal">
                                            Fornisci questo link agli studenti del Liceo per permettere l'autenticazione e la selezione dei laboratori.
                                        </p>
                                    </div>
                                </div>

                                {/* Schedules Section */}
                                <div className="space-y-4 border-t border-white/5 pt-8">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                                            <Clock className="w-4.5 h-4.5" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-widest">Orari dei Turni</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {["1", "2", "3"].map(turnId => (
                                            <div key={turnId} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 space-y-4">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Turno {turnId}</span>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/20 ml-0.5">Inizio</label>
                                                        <input
                                                            type="time"
                                                            className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]"
                                                            value={assemblyData.turn_schedules?.[turnId]?.start || ""}
                                                            onChange={e => {
                                                                const currentSchedules = assemblyData.turn_schedules || {};
                                                                const turnData = currentSchedules[turnId] || { start: "", end: "" };
                                                                handleUpdateAssembly({
                                                                    turn_schedules: {
                                                                        ...currentSchedules,
                                                                        [turnId]: { ...turnData, start: e.target.value }
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/20 ml-0.5">Fine</label>
                                                        <input
                                                            type="time"
                                                            className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]"
                                                            value={assemblyData.turn_schedules?.[turnId]?.end || ""}
                                                            onChange={e => {
                                                                const currentSchedules = assemblyData.turn_schedules || {};
                                                                const turnData = currentSchedules[turnId] || { start: "", end: "" };
                                                                handleUpdateAssembly({
                                                                    turn_schedules: {
                                                                        ...currentSchedules,
                                                                        [turnId]: { ...turnData, end: e.target.value }
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Date & Color Schemes */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Data dell'Evento</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10" />
                                            <input
                                                type="date"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-black outline-none focus:border-primary/50 transition-all font-sans"
                                                value={formatDateToISO(assemblyData.date || "")}
                                                onChange={e => handleUpdateAssembly({ date: formatDateToIT(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Colore del Tema</label>
                                        <div className="flex flex-wrap gap-2.5 p-3.5 bg-white/2 rounded-[2rem] border border-white/5">
                                            {['#10b981', '#3b82f6', '#ef4444', '#a855f7', '#f59e0b', '#64748b', '#E2F33C'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => handleUpdateAssembly({ themeColor: color })}
                                                    className={`w-9 h-9 rounded-xl transition-all ${assemblyData.themeColor === color ? 'scale-110 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {isSaving && (
                                    <div className="fixed bottom-8 right-8 bg-primary text-black px-5 py-3 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-right-4 z-[100]">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvataggio...
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'logs' && (
                            <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
                                <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                                    <AuditLog assemblyId={assemblyId} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showTemplates && (
                <AssemblyTemplates
                    assemblyId={assemblyId}
                    onClose={() => setShowTemplates(false)}
                />
            )}

            {showImportExport && (
                <ActivityImportExport
                    assemblyId={assemblyId}
                    activities={activities}
                    onClose={() => setShowImportExport(false)}
                />
            )}

            {/* Live Monitor Modals */}
            {showExportModal && assemblyData && (
                <AdvancedExportModal
                    onClose={() => setShowExportModal(false)}
                    activities={activities}
                    students={students}
                    activeAssembly={assemblyData}
                    chartRef={chartContainerRef}
                />
            )}

            {analyticsViewId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
                    <ActivityAnalytics
                        activityId={analyticsViewId}
                        currentTurn={currentTurn}
                        allStudents={students}
                        onClose={() => setAnalyticsViewId(null)}
                    />
                </div>
            )}

            {showVagabondi && (
                <StudentManagerModal
                    presentList={metrics.presents}
                    absentList={metrics.absents}
                    nonEnrolledList={metrics.nonEnrolled}
                    imbucatiList={metrics.imbucati}
                    onClose={() => setShowVagabondi(false)}
                />
            )}

            {showStudentLocator && (
                <StudentLocator 
                    students={students} 
                    activities={activities} 
                    currentTurn={currentTurn} 
                    onClose={() => setShowStudentLocator(false)} 
                />
            )}

            {showTimeline && (
                <CheckinTimeline 
                    students={students} 
                    currentTurn={currentTurn} 
                    onClose={() => setShowTimeline(false)} 
                />
            )}

            {showActivityRanking && (
                <ActivityRanking 
                    activities={activities} 
                    currentTurn={currentTurn} 
                    onClose={() => setShowActivityRanking(false)} 
                />
            )}

            {showComparison && (
                <AssemblyComparison 
                    assemblies={assembliesList} 
                    onClose={() => setShowComparison(false)} 
                />
            )}

            {showRMStats && (
                <RoomManagerStats
                    students={students}
                    activities={activities}
                    userProfiles={allUsers}
                    onClose={() => setShowRMStats(false)}
                />
            )}
        </div>
    );
};
export default AssemblyConfig;
