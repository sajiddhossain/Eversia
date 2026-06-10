import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Mail, Loader2, Users, AlertTriangle, Send, Type, CheckCircle2, X, RefreshCw, BarChart3, Zap, Eye, EyeOff, UserX, Bookmark, Shield, PenLine, Megaphone, ChevronDown, ChevronUp, Hash, AtSign } from "lucide-react";
import { marked } from "marked";
import { sendEmailViaBridge, getEnrollmentOpenTemplate, getCustomTemplate } from "../../utils/emailUtils";
import type { EmailProgress, EmailResult } from "../../utils/emailUtils";
import { logAudit } from "../../utils/auditLogger";
import { useAuth } from '../../hooks/useAuth';
import type { Assembly } from '../../types';
import { sanitizeHtml, maskEmail } from "../../utils/security";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════
// 🔔  INLINE TOAST SYSTEM
// ═══════════════════════════════════════════════

interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
}

const TOAST_DURATION = 6000;

function getToastStyle(type: ToastMessage['type']) {
    switch (type) {
        case 'success': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" /> };
        case 'error': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> };
        case 'warning': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: <AlertTriangle className="w-4 h-4" /> };
        case 'info': return { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', icon: <Zap className="w-4 h-4" /> };
    }
}

function getProgressGradient(status: EmailProgress['status']) {
    switch (status) {
        case 'sending': return 'from-primary to-emerald-400';
        case 'retrying': return 'from-amber-400 to-orange-500';
        case 'done': return 'from-emerald-400 to-emerald-500';
        case 'error': return 'from-red-400 to-red-500';
    }
}

const ToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 max-w-sm">
            <AnimatePresence>
                {toasts.map(toast => {
                    const s = getToastStyle(toast.type);
                    return (
                        <motion.div 
                            key={toast.id} 
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className={`${s.bg} border ${s.border} rounded-2xl p-4 backdrop-blur-xl shadow-2xl`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`${s.text} mt-0.5`}>{s.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${s.text}`}>{toast.title}</div>
                                    <p className="text-xs text-white/60 font-medium mt-1 leading-relaxed">{toast.message}</p>
                                </div>
                                <button 
                                    onClick={() => onDismiss(toast.id)} 
                                    className="text-white/20 hover:text-white/60 transition-colors p-1"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};


// ═══════════════════════════════════════════════
// 📊  PROGRESS BAR COMPONENT
// ═══════════════════════════════════════════════

const SendProgressBar: React.FC<{ progress: EmailProgress }> = ({ progress }) => {
    const percent = progress.totalRecipients > 0 
        ? Math.round((progress.sentSoFar / progress.totalRecipients) * 100) 
        : 0;

    const gradient = getProgressGradient(progress.status);

    return (
        <div className="space-y-4 p-6 bg-white/[0.01] border border-white/5 rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 opacity-[0.02] pointer-events-none" />
            
            {/* Header con contatori */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Progresso Invio</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-white/60">
                        Batch {progress.currentBatch}/{progress.totalBatches}
                    </span>
                    <span className="text-lg font-black text-primary">{percent}%</span>
                </div>
            </div>

            {/* Barra di progresso */}
            <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <motion.div 
                    className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(percent, progress.status === 'sending' ? 2 : 0)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>

            {/* Status message */}
            <div className="flex items-center gap-2 relative z-10">
                {progress.status === 'sending' && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                {progress.status === 'retrying' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />}
                {progress.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {progress.status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                <span className="text-[10px] font-black uppercase tracking-wider text-white/40">{progress.message}</span>
            </div>

            {/* Contatori dettagliati */}
            <div className="grid grid-cols-3 gap-3 relative z-10">
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                    <div className="text-xl font-black text-white">{progress.sentSoFar}</div>
                    <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Inviate</div>
                </div>
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                    <div className="text-xl font-black text-white/40">{progress.totalRecipients - progress.sentSoFar}</div>
                    <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Rimanenti</div>
                </div>
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                    <div className="text-xl font-black text-primary">{progress.totalRecipients}</div>
                    <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Totale</div>
                </div>
            </div>
        </div>
    );
};


// ═══════════════════════════════════════════════
// 🔢  STEP NUMBER BADGE
// ═══════════════════════════════════════════════

const StepBadge: React.FC<{ step: number; active?: boolean }> = ({ step, active = true }) => (
    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
        active ? 'bg-primary text-black' : 'bg-white/5 text-white/30'
    }`}>
        {step}
    </div>
);


// ═══════════════════════════════════════════════
// 📬  NOTIFICATION CENTER COMPONENT
// ═══════════════════════════════════════════════

interface NotificationCenterProps {
    assembly: Assembly;
}

// Filter definitions with icons
const RECIPIENT_FILTERS = [
    { id: 'ALL' as const, label: 'Tutti', icon: Users, desc: 'Tutti i registrati', color: 'text-primary' },
    { id: 'UNBOOKED' as const, label: 'Non Iscritti', icon: UserX, desc: 'Nessuna prenotazione', color: 'text-amber-400' },
    { id: 'BOOKED' as const, label: 'Iscritti', icon: Bookmark, desc: 'Con prenotazioni', color: 'text-emerald-400' },
    { id: 'ROOM_MANAGERS' as const, label: 'Room Managers', icon: PenLine, desc: 'Gestori aule', color: 'text-blue-400' },
    { id: 'SECURITY' as const, label: 'Security', icon: Shield, desc: 'Team sicurezza', color: 'text-orange-400' },
    { id: 'CUSTOM' as const, label: 'Manuale', icon: AtSign, desc: 'Email personalizzate', color: 'text-violet-400' },
];

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ assembly }) => {
    const { userProfile } = useAuth();
    const [recipientFilter, setRecipientFilter] = useState<'ALL' | 'UNBOOKED' | 'BOOKED' | 'CUSTOM' | 'ROOM_MANAGERS' | 'SECURITY'>('ALL');
    const [customEmails, setCustomEmails] = useState("");
    
    const [templateType, setTemplateType] = useState<'ENROLLMENT' | 'CUSTOM'>('CUSTOM');
    const [customSubject, setCustomSubject] = useState("");
    const [customTitle, setCustomTitle] = useState("");
    const [customMessage, setCustomMessage] = useState("");

    const [isCalculating, setIsCalculating] = useState(false);
    const [targetEmails, setTargetEmails] = useState<string[]>([]);
    
    const [isSending, setIsSending] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [sendProgress, setSendProgress] = useState<EmailProgress | null>(null);
    const [showRecipients, setShowRecipients] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showPreview, setShowPreview] = useState(true);

    // Toast system
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
        const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        const toast: ToastMessage = { id, type, title, message, timestamp: Date.now() };
        setToasts(prev => [...prev, toast]);

        const timeout = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
            toastTimeouts.current.delete(id);
        }, TOAST_DURATION);
        toastTimeouts.current.set(id, timeout);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        const timeout = toastTimeouts.current.get(id);
        if (timeout) {
            clearTimeout(timeout);
            toastTimeouts.current.delete(id);
        }
    }, []);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            toastTimeouts.current.forEach(t => clearTimeout(t));
        };
    }, []);

    // Calc recipients when filter changes
    useEffect(() => {
        const calculateRecipients = async () => {
            if (recipientFilter === 'CUSTOM') {
                const emails = customEmails.split(',').map(e => e.trim()).filter(e => e.includes('@'));
                setTargetEmails(emails);
                return;
            }

            setIsCalculating(true);
            try {
                let assemblyStudentsData: any[] = [];
                let registeredUsersData: any[] = [];

                // 1. Fetch students enrolled in this assembly
                try {
                    const snap = await getDocs(query(collection(db, "students"), where("assemblyId", "==", assembly.id)));
                    assemblyStudentsData = snap.docs.map(doc => doc.data());
                } catch (err: any) {
                    console.error("Error fetching students for assembly:", err);
                    addToast('warning', 'Errore Studenti Assemblea', `Impossibile caricare gli studenti iscritti: ${err.message || err}`);
                }

                // 2. Fetch all registered users with role 'STUDENT'
                try {
                    const snap = await getDocs(query(collection(db, "users"), where("role", "==", "STUDENT")));
                    registeredUsersData = snap.docs.map(doc => doc.data());
                } catch (err: any) {
                    console.error("Error fetching registered users:", err);
                    addToast('warning', 'Errore Utenti Registrati', `Impossibile caricare gli utenti registrati: ${err.message || err}`);
                }

                // Merge students by email to get the complete list of students
                const allStudentEmailsMap = new Map<string, { email: string; scheduled_turns?: Record<string, string | null> }>();

                // Add students from the 'students' collection (who have assemblyId and potentially bookings)
                assemblyStudentsData.forEach(s => {
                    if (s.email) {
                        allStudentEmailsMap.set(s.email.toLowerCase(), {
                            email: s.email,
                            scheduled_turns: s.scheduled_turns
                        });
                    }
                });

                // Add users from 'users' collection with role 'STUDENT' (registered on the platform)
                registeredUsersData.forEach(u => {
                    if (u.email) {
                        const emailLower = u.email.toLowerCase();
                        if (!allStudentEmailsMap.has(emailLower)) {
                            allStudentEmailsMap.set(emailLower, {
                                email: u.email,
                                scheduled_turns: {}
                            });
                        }
                    }
                });

                const mergedStudents = Array.from(allStudentEmailsMap.values());
                let filteredEmails: string[] = [];

                if (recipientFilter === 'ALL') {
                    filteredEmails = mergedStudents.map(s => s.email).filter(e => e);
                } else if (recipientFilter === 'BOOKED' || recipientFilter === 'UNBOOKED') {
                    filteredEmails = mergedStudents.filter(studentData => {
                        const hasBooking = studentData && studentData.scheduled_turns && 
                                           Object.values(studentData.scheduled_turns).some(val => val !== null && val !== "");
                        
                        if (recipientFilter === 'BOOKED') return hasBooking;
                        if (recipientFilter === 'UNBOOKED') return !hasBooking;
                        return false;
                    }).map(s => s.email).filter(e => e);
                } else if (recipientFilter === 'ROOM_MANAGERS' || recipientFilter === 'SECURITY') {
                    const rolesSnap = await getDocs(query(collection(db, "assembly_roles"), where("assemblyId", "==", assembly.id)));
                    const targetRole = recipientFilter === 'ROOM_MANAGERS' ? 'ROOM_MANAGER' : 'SECURITY';
                    
                    filteredEmails = rolesSnap.docs
                        .filter(doc => doc.data().role === targetRole)
                        .map(doc => doc.data().email)
                        .filter((email): email is string => typeof email === 'string' && email.includes('@'));
                }

                const ALLOWED_DOMAINS = ['liceoagnesi.edu.it', 'liceoagnesi.gov.it'];
                const cleanEmails = Array.from(new Set(
                    filteredEmails
                        .map(e => e.toLowerCase().trim())
                        .filter(e => {
                            if (!e || !e.includes('@')) return false;
                            if (recipientFilter === 'ROOM_MANAGERS' || recipientFilter === 'SECURITY') return true;
                            return ALLOWED_DOMAINS.some(domain => e.endsWith(`@${domain}`));
                        })
                ));
                setTargetEmails(cleanEmails);
            } catch (error: any) {
                console.error("Error calculating recipients:", error);
                addToast('error', 'Errore Calcolo Destinatari', `Si è verificato un errore durante il calcolo dei destinatari: ${error.message || error}`);
            } finally {
                setIsCalculating(false);
            }
        };

        const timeoutId = setTimeout(calculateRecipients, recipientFilter === 'CUSTOM' ? 500 : 0);
        return () => clearTimeout(timeoutId);
    }, [recipientFilter, customEmails, assembly.id]);

    const handleSend = async () => {
        if (targetEmails.length === 0) {
            addToast('warning', 'Nessun Destinatario', 'Seleziona almeno un destinatario prima di inviare.');
            return;
        }

        if (templateType === 'CUSTOM') {
            if (!customSubject || !customTitle || !customMessage) {
                addToast('warning', 'Campi Mancanti', 'Compila tutti i campi del messaggio personalizzato.');
                return;
            }
        }

        setShowConfirm(true);
    };

    const confirmAndSend = async () => {
        let template;
        if (templateType === 'ENROLLMENT') {
            const joinLink = `${window.location.origin}/join/${assembly.id}`;
            template = getEnrollmentOpenTemplate(assembly.name, joinLink);
        } else {
            template = getCustomTemplate(customSubject, customTitle, customMessage);
        }

        setIsSending(true);
        setSendProgress(null);
        setShowConfirm(false);

        try {
            const result: EmailResult = await sendEmailViaBridge({
                recipients: targetEmails,
                useBcc: true,
                ...template,
                onProgress: (progress) => {
                    setSendProgress(progress);
                },
            });

            if (result.success) {
                await logAudit('ANNOUNCEMENT_SENT', userProfile?.email || 'System', `Inviata email '${template.subject}' a ${targetEmails.length} studenti (Filtro: ${recipientFilter})`, assembly.id);
                
                addToast('success', 'Invio Completato', 
                    `${result.data?.sent || targetEmails.length} email inviate con successo!` + 
                    (result.quota ? ` Quota residua: ${result.quota.remainingToday}` : '')
                );
                
                if (templateType === 'CUSTOM') {
                    setCustomSubject("");
                    setCustomTitle("");
                    setCustomMessage("");
                }
            } else if (result.partialSuccess) {
                addToast('warning', 'Invio Parziale', 
                    `${result.data?.sent || 0} email inviate, ${result.data?.failed || 0} fallite. ${result.error || ''}`
                );
            } else {
                addToast('error', 'Invio Fallito', result.error || 'Errore sconosciuto durante l\'invio.');
            }
        } catch (error: any) {
            console.error("Send email error:", error);
            addToast('error', 'Errore Critico', error.message || 'Errore imprevisto durante l\'invio.');
        } finally {
            setIsSending(false);
            setTimeout(() => setSendProgress(null), 8000);
        }
    };

    const handleSendTest = async () => {
        if (!userProfile?.email) {
            addToast('error', 'Errore Profilo', 'Impossibile identificare la tua email per l\'invio di test.');
            return;
        }

        if (templateType === 'CUSTOM') {
            if (!customSubject || !customTitle || !customMessage) {
                addToast('warning', 'Campi Mancanti', 'Compila tutti i campi prima di inviare il test.');
                return;
            }
        }

        let template;
        if (templateType === 'ENROLLMENT') {
            const joinLink = `${window.location.origin}/join/${assembly.id}`;
            template = getEnrollmentOpenTemplate(assembly.name, joinLink);
        } else {
            template = getCustomTemplate(customSubject, customTitle, customMessage);
        }

        setIsSendingTest(true);
        addToast('info', 'Invio Test', `Spedizione email di test a: ${userProfile.email}...`);

        try {
            const result: EmailResult = await sendEmailViaBridge({
                recipients: [userProfile.email.toLowerCase().trim()],
                useBcc: false,
                ...template,
            });

            if (result.success) {
                await logAudit('ANNOUNCEMENT_SENT', userProfile?.email || 'System', `Inviata email di TEST '${template.subject}' a se stesso`, assembly.id);
                addToast('success', 'Test Inviato', `Email di test recapitata con successo a ${userProfile.email}!`);
            } else {
                addToast('error', 'Invio Test Fallito', result.error || 'Errore durante l\'invio dell\'email di test.');
            }
        } catch (error: any) {
            console.error("Send test email error:", error);
            addToast('error', 'Errore Critico', error.message || 'Errore imprevisto durante l\'invio del test.');
        } finally {
            setIsSendingTest(false);
        }
    };

    // Get the active filter info
    const activeFilter = RECIPIENT_FILTERS.find(f => f.id === recipientFilter)!;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col items-center text-center border-b border-white/5 pb-5">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary mb-3">
                    <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-black uppercase tracking-widest italic">Centro Comunicazioni</h3>
                <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mt-1">Email Bridge v2 · {assembly.name}</p>
            </div>

            {/* ═══ PROGRESS BAR — visibile durante l'invio ═══ */}
            {sendProgress && <SendProgressBar progress={sendProgress} />}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ═══════════════════════════════════════ */}
                {/* LEFT COL: TARGET SELECTION              */}
                {/* ═══════════════════════════════════════ */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="glass-card rounded-[24px] p-6 space-y-6">
                        
                        {/* Section Header */}
                        <div className="flex items-center gap-3">
                            <StepBadge step={1} />
                            <div>
                                <h4 className="text-[11px] font-display font-black uppercase tracking-wider text-white/50">Destinatari</h4>
                                <p className="text-[9px] text-white/20 font-bold mt-0.5">Chi riceverà il messaggio</p>
                            </div>
                        </div>

                        {/* Filter Grid — compact 3-col on mobile, 2-col on desktop */}
                        <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
                            {RECIPIENT_FILTERS.map(filter => {
                                const Icon = filter.icon;
                                const isActive = recipientFilter === filter.id;
                                return (
                                    <motion.button
                                        key={filter.id}
                                        onClick={() => setRecipientFilter(filter.id)}
                                        disabled={isSending}
                                        whileHover={isSending ? {} : { scale: 1.02, y: -1 }}
                                        whileTap={isSending ? {} : { scale: 0.98 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        className={`group w-full text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
                                            isActive
                                                ? 'bg-white/[0.03] border-white/10 shadow-[0_8px_20px_-6px_rgba(0,130,230,0.12)]' 
                                                : 'bg-black/30 border-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.01]'
                                        } ${isSending ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        {isActive && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                                        )}
                                        <div className="flex items-center gap-2.5 relative z-10">
                                            <div className={`p-1.5 rounded-xl transition-all shrink-0 ${
                                                isActive ? 'bg-white/5 border border-white/10' : 'bg-black/20 border border-white/[0.02] group-hover:border-white/5'
                                            }`}>
                                                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? filter.color : 'text-white/30 group-hover:text-white/50'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-[10px] font-display font-black uppercase tracking-widest truncate transition-colors ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                                                    {filter.label}
                                                </div>
                                                <div className={`text-[8px] font-bold mt-0.5 truncate transition-colors ${isActive ? 'text-white/30' : 'text-white/15'}`}>
                                                    {filter.desc}
                                                </div>
                                            </div>
                                            {isActive && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-in zoom-in duration-200" />
                                            )}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Custom Email Input */}
                        {recipientFilter === 'CUSTOM' && (
                            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="text-[9px] font-display font-black uppercase tracking-widest text-white/20 flex items-center gap-1.5">
                                    <AtSign className="w-3.5 h-3.5" /> Inserisci email (separate da virgola)
                                </label>
                                <textarea
                                    className="w-full bg-black/40 border border-white/[0.06] rounded-2xl p-4 text-xs font-mono text-white/80 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 min-h-[90px] transition-all resize-none placeholder:text-white/15 shadow-inner"
                                    placeholder="studente1@liceoagnesi.edu.it, studente2@liceo..."
                                    value={customEmails}
                                    onChange={e => setCustomEmails(e.target.value)}
                                    disabled={isSending}
                                />
                            </div>
                        )}

                        {/* Recipients Counter Card */}
                        <div className={`p-5 rounded-2xl border transition-all ${
                            targetEmails.length > 0 
                                ? 'bg-primary/5 border-primary/15' 
                                : 'bg-white/[0.01] border-white/[0.03]'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-display font-black uppercase tracking-widest text-white/30">
                                        Destinatari
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(() => { const ActiveIcon = activeFilter.icon; return <ActiveIcon className={`w-3.5 h-3.5 ${activeFilter.color}`} />; })()}
                                        <span className="text-[10px] font-bold text-white/40">{activeFilter.label}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-display font-black text-primary tabular-nums leading-none">
                                        {isCalculating ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : targetEmails.length}
                                    </div>
                                    {targetEmails.length > 50 && !isCalculating && (
                                        <div className="text-[8px] font-bold text-white/20 mt-1 uppercase tracking-wider">
                                            {Math.ceil(targetEmails.length / 50)} batch
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {targetEmails.length > 0 && !isCalculating && (
                                <button
                                    onClick={() => setShowRecipients(!showRecipients)}
                                    className="mt-4 flex items-center gap-1.5 text-[9px] font-display font-black text-primary/50 hover:text-primary uppercase tracking-widest transition-colors w-full"
                                >
                                    {showRecipients ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    {showRecipients ? 'Nascondi lista' : 'Vedi lista email'}
                                </button>
                            )}

                            <AnimatePresence>
                                {showRecipients && targetEmails.length > 0 && !isCalculating && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="mt-3.5 bg-black/40 border border-white/[0.04] rounded-xl p-3 max-h-[140px] overflow-y-auto custom-scrollbar overflow-hidden"
                                    >
                                        <div className="flex flex-col gap-1">
                                            {targetEmails.map((email, idx) => (
                                                <div key={idx} className="text-[9px] font-mono text-white/40 truncate py-0.5 px-1.5 rounded hover:bg-white/5 hover:text-white/60 transition-colors" title={email}>
                                                    {maskEmail(email)}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════ */}
                {/* RIGHT COL: COMPOSER                    */}
                {/* ═══════════════════════════════════════ */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="glass-card rounded-[24px] p-6 space-y-6">
                        
                        {/* Composer Header + Template Toggle */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <StepBadge step={2} />
                                <div>
                                    <h4 className="text-[11px] font-display font-black uppercase tracking-wider text-white/50">Messaggio</h4>
                                    <p className="text-[9px] text-white/20 font-bold mt-0.5">Componi o scegli un template</p>
                                </div>
                            </div>

                            <div className="flex bg-black/40 border border-white/[0.06] rounded-xl p-1 relative overflow-hidden shrink-0 self-start sm:self-auto">
                                <button
                                    onClick={() => setTemplateType('CUSTOM')}
                                    disabled={isSending}
                                    className={`relative z-10 px-4 py-2 rounded-lg text-[9px] font-display font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                                        templateType === 'CUSTOM' ? 'text-black' : 'text-white/40 hover:text-white/70'
                                    }`}
                                >
                                    <PenLine className="w-3.5 h-3.5 shrink-0" />
                                    <span>Personalizzato</span>
                                    {templateType === 'CUSTOM' && (
                                        <motion.div
                                            layoutId="template-type-pill"
                                            className="absolute inset-0 bg-primary rounded-lg -z-10"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => setTemplateType('ENROLLMENT')}
                                    disabled={isSending}
                                    className={`relative z-10 px-4 py-2 rounded-lg text-[9px] font-display font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                                        templateType === 'ENROLLMENT' ? 'text-black' : 'text-white/40 hover:text-white/70'
                                    }`}
                                >
                                    <Megaphone className="w-3.5 h-3.5 shrink-0" />
                                    <span>Iscrizioni</span>
                                    {templateType === 'ENROLLMENT' && (
                                        <motion.div
                                            layoutId="template-type-pill"
                                            className="absolute inset-0 bg-brand-lime rounded-lg -z-10"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            </div>
                        </div>

                        {templateType === 'ENROLLMENT' ? (
                            /* ─── Enrollment Template Info ─── */
                            <div className="p-6 border border-amber-500/10 bg-amber-500/5 rounded-2xl space-y-4">
                                <div className="flex items-center gap-3 text-amber-400">
                                    <Megaphone className="w-5 h-5" />
                                    <h5 className="font-display font-black uppercase tracking-wider text-sm">Template Iscrizioni</h5>
                                </div>
                                <p className="text-xs text-white/50 font-medium leading-relaxed">
                                    Verrà inviata la mail premium con il branding eversia per notificare l&apos;apertura delle iscrizioni a tutti i destinatari selezionati.
                                </p>
                                <div className="bg-black/30 border border-white/[0.04] rounded-xl p-4 flex items-center gap-3.5">
                                    <Hash className="w-4 h-4 text-primary shrink-0" />
                                    <code className="text-[11px] text-primary font-mono break-all">{`${window.location.origin}/join/${assembly.id}`}</code>
                                </div>
                            </div>
                        ) : (
                            /* ─── Custom Message Composer ─── */
                            <div className="space-y-6 animate-in fade-in duration-200">
                                
                                {/* Subject */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-display font-black uppercase tracking-widest text-white/30">Oggetto Email</label>
                                        <span className="text-[9px] font-mono font-bold text-white/20">{customSubject.length}/100</span>
                                    </div>
                                    <input
                                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-white/15"
                                        placeholder="es. Importante: Sollecito Iscrizioni Assemblea"
                                        value={customSubject}
                                        onChange={e => setCustomSubject(e.target.value)}
                                        maxLength={100}
                                        disabled={isSending}
                                    />
                                </div>

                                {/* Title */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-display font-black uppercase tracking-widest text-white/30">Titolo Banner</label>
                                        <span className="text-[9px] font-mono font-bold text-white/20">{customTitle.length}/50</span>
                                    </div>
                                    <input
                                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-white/15"
                                        placeholder="es. AVVISO ISCRIZIONI"
                                        value={customTitle}
                                        onChange={e => setCustomTitle(e.target.value)}
                                        maxLength={50}
                                        disabled={isSending}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Editor + Preview Grid */}
                        <div className="space-y-2">
                            {templateType === 'CUSTOM' && (
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[9px] font-display font-black uppercase tracking-widest text-white/30">Corpo del Messaggio</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-[8px] font-display font-black uppercase tracking-widest text-brand-lime/80">
                                            <Type className="w-3.5 h-3.5" /> Markdown Supportato
                                        </div>
                                        <button 
                                            onClick={() => setShowPreview(!showPreview)}
                                            className="flex items-center gap-1.5 text-[8px] font-display font-black uppercase tracking-widest text-white/30 hover:text-white/50 transition-colors"
                                        >
                                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            {showPreview ? 'Nascondi' : 'Anteprima'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                                {templateType === 'CUSTOM' && (
                                    <textarea
                                        className="w-full bg-black/30 border border-white/[0.06] rounded-2xl p-4 text-sm font-medium text-white/80 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 min-h-[320px] font-mono transition-all resize-none placeholder:text-white/15"
                                        placeholder={"Scrivi qui il tuo messaggio.\n\nPuoi usare il Markdown!\n**Grassetto**, *Corsivo*, [Link](https://...)\n- Lista ad elenco"}
                                        value={customMessage}
                                        onChange={e => setCustomMessage(e.target.value)}
                                        disabled={isSending}
                                    />
                                )}

                                {/* Live Preview macOS Mockup */}
                                {showPreview && (
                                    <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-black/40 shadow-2xl flex flex-col h-[400px]">
                                        {/* macOS Window Titlebar */}
                                        <div className="bg-black/30 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                                            {/* macOS traffic light buttons */}
                                            <div className="flex gap-1.5 items-center w-20">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                                            </div>
                                            
                                            {/* Address Bar */}
                                            <div className="flex-1 max-w-[140px] sm:max-w-md bg-white/[0.03] border border-white/[0.05] rounded-lg py-1 px-3 flex items-center justify-center gap-1.5 text-[9px] font-mono text-white/30 truncate">
                                                <span className="text-emerald-500/60 font-sans">🔒</span>
                                                <span className="truncate">eversia.it/preview-email</span>
                                            </div>

                                            {/* Utility placeholder */}
                                            <div className="w-20 text-right text-[8px] font-display font-black tracking-widest text-brand-lime/80 uppercase shrink-0">
                                                ANTEPRIMA
                                            </div>
                                        </div>

                                        {/* Email Metadata Details */}
                                        <div className="bg-black/25 px-5 py-3 border-b border-white/[0.04] text-[10px] space-y-1 text-white/40 font-medium shrink-0">
                                            <div className="truncate">
                                                <span className="text-white/20 font-display font-black uppercase tracking-wider text-[8px] mr-2">Da:</span>
                                                <span className="text-white/70 font-semibold">eversia</span>
                                                <span className="text-white/30 font-mono ml-1">&lt;noreply@eversia.it&gt;</span>
                                            </div>
                                            <div className="truncate">
                                                <span className="text-white/20 font-display font-black uppercase tracking-wider text-[8px] mr-2">A:</span>
                                                <span className="text-white/60">studente@liceoagnesi.edu.it</span>
                                                <span className="text-white/20 text-[8px] ml-1.5 bg-white/5 px-1 py-0.5 rounded uppercase tracking-widest">BCC</span>
                                            </div>
                                            <div className="truncate">
                                                <span className="text-white/20 font-display font-black uppercase tracking-wider text-[8px] mr-2">Oggetto:</span>
                                                <span className="text-brand-lime font-black">
                                                    {templateType === 'ENROLLMENT' ? `📣 Iscrizioni Aperte: ${assembly.name}` : (customSubject || "(Nessun oggetto)")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Email Viewport */}
                                        <div className="flex-1 bg-[#f8fafc] overflow-y-auto p-4 custom-scrollbar text-[#1e293b]">
                                            <div className="max-w-[450px] mx-auto bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-5 space-y-5">
                                                {/* Email Logo / Title */}
                                                <div className="text-center">
                                                    <span className="inline-block bg-[#E2F33C] text-black px-3.5 py-1 rounded-xl text-[9px] font-display font-black uppercase tracking-widest border border-[#d4e335]">
                                                        {templateType === 'ENROLLMENT' ? "ISCRIZIONI APERTE" : (customTitle || "AVVISO")}
                                                    </span>
                                                </div>

                                                {/* Email content */}
                                                {templateType === 'ENROLLMENT' ? (
                                                    <div className="space-y-3.5 text-[11px] leading-relaxed text-[#334155]">
                                                        <p className="font-bold text-[#1e293b] text-xs">Ciao Studente,</p>
                                                        <p>
                                                            Le iscrizioni per l&apos;assemblea d&apos;istituto <strong>{assembly.name}</strong> sono ufficialmente aperte!
                                                        </p>
                                                        <p>
                                                            Accedi subito alla piattaforma tramite il link sottostante per prenotare le tue attività prima che i posti si esauriscano.
                                                        </p>
                                                        <div className="py-2.5 text-center">
                                                            <a 
                                                                href="#" 
                                                                onClick={(e) => e.preventDefault()} 
                                                                className="inline-block bg-[#0082e6] hover:bg-[#006cc0] text-white px-5 py-2 rounded-xl text-[10px] font-display font-black uppercase tracking-widest text-center no-underline"
                                                            >
                                                                Scegli Attività
                                                            </a>
                                                        </div>
                                                        <p className="text-[9px] text-[#94a3b8] italic">
                                                            Nota: Se il pulsante non funziona, copia ed incolla questo link nel browser: {`${window.location.origin}/join/${assembly.id}`}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        className="email-markdown-preview text-[11px] leading-relaxed text-[#334155]"
                                                        dangerouslySetInnerHTML={{ 
                                                            __html: sanitizeHtml(
                                                                customMessage 
                                                                    ? (marked.parse(customMessage, { async: false }) as string) 
                                                                    : '<p style="color: #94a3b8; font-style: italic; text-align: center;">Scrivi un messaggio per visualizzare l&apos;anteprima...</p>'
                                                            ) 
                                                        }}
                                                    />
                                                )}

                                                {/* Email Footer */}
                                                <div className="pt-3.5 border-t border-[#e2e8f0] text-center">
                                                    <span className="text-[9px] font-display font-black text-[#94a3b8] uppercase tracking-[0.2em]">eversia</span>
                                                    <p className="text-[8px] text-[#cbd5e1] mt-1 leading-normal">Questa è una comunicazione automatica relativa all&apos;Assemblea d&apos;Istituto.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Send Button Bar ─── */}
                        <div className="pt-5 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/25">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500/60" />
                                <span>Privacy BCC attiva · Batching automatico</span>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <motion.button
                                    onClick={handleSendTest}
                                    disabled={isSending || isSendingTest || isCalculating}
                                    whileHover={isSending || isSendingTest || isCalculating ? {} : { scale: 1.02 }}
                                    whileTap={isSending || isSendingTest || isCalculating ? {} : { scale: 0.98 }}
                                    className="px-5 py-3 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.08] text-white/80 rounded-xl font-display font-black text-[10px] uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSendingTest ? (
                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Invio Test...</>
                                    ) : (
                                        <><Eye className="w-3.5 h-3.5 text-brand-lime" /> Invia Test a Me</>
                                    )}
                                </motion.button>
                                
                                <motion.button
                                    onClick={handleSend}
                                    disabled={isSending || isSendingTest || isCalculating || targetEmails.length === 0}
                                    whileHover={isSending || isSendingTest || isCalculating || targetEmails.length === 0 ? {} : { scale: 1.02 }}
                                    whileTap={isSending || isSendingTest || isCalculating || targetEmails.length === 0 ? {} : { scale: 0.98 }}
                                    className="px-6 py-3 bg-primary text-black rounded-xl font-display font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#33a1ff] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-lg shadow-primary/20 shrink-0"
                                >
                                    {isSending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Invio...</>
                                    ) : (
                                        <><Send className="w-3.5 h-3.5" /> Invia a {targetEmails.length}</>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Confirm Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <NotificationConfirmModal 
                        recipientCount={targetEmails.length}
                        subject={templateType === 'ENROLLMENT' ? `📣 Iscrizioni Aperte: ${assembly.name}` : customSubject}
                        templateType={templateType}
                        loading={isSending}
                        onConfirm={confirmAndSend}
                        onClose={() => setShowConfirm(false)}
                    />
                )}
            </AnimatePresence>

            {/* Toast Container */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
};


// ═══════════════════════════════════════════════
// ✅  CONFIRM MODAL
// ═══════════════════════════════════════════════

interface NotificationConfirmModalProps {
    recipientCount: number;
    subject: string;
    templateType: 'ENROLLMENT' | 'CUSTOM';
    loading: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

const NotificationConfirmModal: React.FC<NotificationConfirmModalProps> = ({ recipientCount, subject, templateType, loading, onConfirm, onClose }) => {
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/85 backdrop-blur-md" 
                onClick={onClose} 
            />
            
            {/* Modal Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="relative w-full max-w-md bg-[#070b13]/90 border border-white/10 rounded-[28px] shadow-2xl overflow-hidden glass-card"
            >
                {/* Visual Glass Edge Light Overlay */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                
                <div className="p-7 space-y-6">
                    
                    {/* Icon + Title */}
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20 shadow-[0_0_15px_rgba(0,130,230,0.1)]">
                            <Send className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-display font-black text-white uppercase tracking-wider italic">Conferma Invio</h3>
                        <p className="text-[10px] text-white/30 leading-relaxed font-medium max-w-xs mx-auto">
                            L&apos;operazione è irreversibile e invierà una mail reale a tutti i destinatari.
                        </p>
                    </div>

                    {/* Details Card */}
                    <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.05] space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-[9px] font-display font-black uppercase tracking-widest text-white/30">Destinatari</div>
                            <div className="text-lg font-display font-black text-primary flex items-center gap-1.5 tabular-nums">
                                <Users className="w-4 h-4" /> {recipientCount}
                            </div>
                        </div>
                        <div className="h-[1px] bg-white/[0.05]" />
                        <div className="space-y-1">
                            <div className="text-[9px] font-display font-black uppercase tracking-widest text-white/30">Oggetto</div>
                            <p className="text-xs font-semibold text-white/80 leading-relaxed">{subject}</p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <span className={`px-2.5 py-1 rounded-lg text-[8px] font-display font-black uppercase tracking-widest ${templateType === 'ENROLLMENT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-primary/10 text-primary border border-primary/15'}`}>
                                {templateType === 'ENROLLMENT' ? 'Iscrizioni' : 'Custom'}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[8px] font-display font-black uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> BCC
                            </span>
                        </div>
                    </div>

                    {/* Batching / Volume info */}
                    {recipientCount > 50 && (
                        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                            <BarChart3 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[9px] font-display font-black uppercase text-primary tracking-wider">Batching Attivo</p>
                                <p className="text-[9px] text-primary/60 font-bold leading-relaxed mt-0.5">
                                    {Math.ceil(recipientCount / 50)} batch da 50 destinatari con progress in tempo reale.
                                </p>
                            </div>
                        </div>
                    )}

                    {recipientCount > 500 && (
                        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[9px] font-display font-black uppercase text-amber-400 tracking-wider">Volume Elevato</p>
                                <p className="text-[9px] text-amber-400/60 font-bold leading-relaxed mt-0.5">
                                    L&apos;invio a {recipientCount} utenti potrebbe richiedere alcuni minuti.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <motion.button
                            onClick={onConfirm}
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-3.5 bg-primary text-black rounded-xl text-[10px] font-display font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/10 hover:bg-[#33a1ff] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Lancia
                        </motion.button>
                        <motion.button
                            onClick={onClose}
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-5 py-3.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-white/40 hover:text-white/75 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all"
                        >
                            Indietro
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

