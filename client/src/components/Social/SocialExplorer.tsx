import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Bell, Search, Sparkles } from 'lucide-react';
import { UnauthenticatedGate } from '../Common/UnauthenticatedGate';
import { UserDiscovery } from '../Profile/components/UserDiscovery';
import { Leaderboard } from '../Profile/components/Leaderboard';
import { FriendRequestsPanel } from '../Profile/components/FriendRequestsPanel';
import { collection, query, where, doc, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import type { FriendRequest, UserProfile } from '../../types';
import { motion } from 'framer-motion';

// ── Helper: distingue errori permission-denied attesi da veri bug ──
const isPermissionError = (err: any): boolean => {
    const code = err?.code || '';
    const msg  = err?.message || '';
    return code === 'permission-denied' ||
           code === 'firestore/permission-denied' ||
           msg.toLowerCase().includes('permission') ||
           msg.toLowerCase().includes('insufficient');
};

// ── Helper: risolve i dati utente da un doc richiesta (evita N+1 getDoc) ──
async function resolveUser(uid: string, embeddedData?: Partial<UserProfile>): Promise<UserProfile | undefined> {
    if (embeddedData?.displayName) return embeddedData as UserProfile;
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? (snap.data() as UserProfile) : undefined;
    } catch {
        return undefined;
    }
}

// 2026 ScrollReveal Component
interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: string;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, className = '', delay = '0ms' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-5%" }}
            transition={{ duration: 0.5, delay: parseFloat(delay) / 1000, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// 2026 Cursor spotlight hover tracker
const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
};

const SectionHeader: React.FC<{ icon: React.ElementType; label: string; color: string; badge?: number }> = ({ icon: Icon, label, color, badge }) => (
    <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center ${color} border border-white/5 shadow-inner`}>
            <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xs md:text-sm font-semibold tracking-wider text-white/50 flex items-center gap-3 font-display">
            {label}
            {badge !== undefined && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold animate-pulse">
                    {badge}
                </span>
            )}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
);

export const SocialExplorer: React.FC = () => {
    const { userProfile, loading: authLoading } = useAuth();
    const [incomingRequests, setIncomingRequests] = React.useState<(FriendRequest & { id: string; fromUser?: UserProfile })[]>([]);
    const [outgoingRequests, setOutgoingRequests] = React.useState<(FriendRequest & { id: string; toUser?: UserProfile })[]>([]);
    const [loading, setLoading] = React.useState(true);

    const navigate = useNavigate();
    const location = useLocation();

    const getActiveTab = () => {
        if (location.pathname.endsWith('/leaderboard')) return 'LEADERBOARD';
        if (location.pathname.endsWith('/requests')) return 'REQUESTS';
        return 'DISCOVERY';
    };

    const activeTab = getActiveTab();

    // Listener real-time per tutte le richieste (badge e tab)
    React.useEffect(() => {
        if (!userProfile?.uid) return;
        setLoading(true);

        const incQ = query(collection(db, 'friendRequests'), where('to', '==', userProfile.uid), where('status', '==', 'PENDING'));
        const outQ = query(collection(db, 'friendRequests'), where('from', '==', userProfile.uid), where('status', '==', 'PENDING'));

        const unsubInc = onSnapshot(incQ, async (snap) => {
            const incs = await Promise.all(snap.docs.map(async (d) => {
                const req = d.data() as FriendRequest & { fromUserData?: Partial<UserProfile> };
                const fromUser = await resolveUser(req.from, req.fromUserData);
                return { ...req, id: d.id, fromUser };
            }));
            setIncomingRequests(incs);
            setLoading(false);
        }, (err) => {
            if (!isPermissionError(err)) console.error('[Social] Inc snapshot error:', err);
            setLoading(false);
        });

        const unsubOut = onSnapshot(outQ, async (snap) => {
            const outs = await Promise.all(snap.docs.map(async (d) => {
                const req = d.data() as FriendRequest & { toUserData?: Partial<UserProfile> };
                const toUser = await resolveUser(req.to, req.toUserData);
                return { ...req, id: d.id, toUser };
            }));
            setOutgoingRequests(outs);
        }, (err) => {
            if (!isPermissionError(err)) console.error('[Social] Out snapshot error:', err);
        });

        return () => {
            unsubInc();
            unsubOut();
        };
    }, [userProfile?.uid]);

    const handleAcceptRequest = async (requestId: string, fromUid: string) => {
        if (!userProfile) return;
        try {
            const acceptFriendRequestFn = httpsCallable(functions, 'acceptFriendRequest');
            await acceptFriendRequestFn({ requestId, fromUid });
            setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (err) { console.error("Accept error:", err); }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'friendRequests', requestId));
            setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (err) { console.error("Reject error:", err); }
    };

    const handleCancelSent = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'friendRequests', requestId));
            setOutgoingRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (err) { console.error("Cancel error:", err); }
    };

    if (authLoading) return null;

    if (!userProfile) {
        return (
            <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white overflow-x-hidden relative -mt-20 pt-20">
                {/* Background Glows */}
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/10 blur-[180px] animate-pulse pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
                    <UnauthenticatedGate 
                        title="ESPLORA LA COMMUNITY"
                        description="Scopri chi sta partecipando alle assemblee, scala la classifica XP e connettiti con gli altri studenti del Liceo Agnesi. Effettua l'accesso per sbloccare tutte le funzionalità social."
                    />
                </div>
            </div>
        );
    }

    if (activeTab === 'LEADERBOARD') {
        return (
            <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white selection:bg-primary/30 overflow-x-hidden relative pb-20 -mt-20 pt-20">
                {/* Background Glows */}
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/10 blur-[180px] animate-pulse pointer-events-none" />
                <div className="absolute top-1/4 -right-32 w-80 h-80 bg-blue-500/10 blur-[150px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 md:py-20 pb-28 relative z-10">
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate('/social')}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white transition-colors cursor-pointer group mb-8"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Torna alla Community
                    </button>

                    <div className="space-y-8">
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <h1 className="text-4xl xs:text-5xl md:text-7xl font-black italic tracking-tighter leading-none font-display">
                                Classifica <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 drop-shadow-[0_0_40px_rgba(251,191,36,0.2)]">Globale</span>
                            </h1>
                            <p className="text-white/40 font-semibold text-sm md:text-lg max-w-xl tracking-tight leading-snug">
                                I campioni del Liceo Agnesi ordinati per punti XP guadagnati.
                            </p>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl md:rounded-[3rem] p-4 md:p-10 backdrop-blur-md shadow-inner glass-card">
                            <Leaderboard />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'REQUESTS') {
        return (
            <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white selection:bg-primary/30 overflow-x-hidden relative pb-20 -mt-20 pt-20">
                {/* Background Glows */}
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/10 blur-[180px] animate-pulse pointer-events-none" />
                <div className="absolute top-1/4 -right-32 w-80 h-80 bg-blue-500/10 blur-[150px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 md:py-20 pb-28 relative z-10">
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate('/social')}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white transition-colors cursor-pointer group mb-8"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Torna alla Community
                    </button>

                    <div className="space-y-8">
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <h1 className="text-4xl xs:text-5xl md:text-7xl font-black italic tracking-tighter leading-none font-display">
                                Centro <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-brand-lime drop-shadow-[0_0_40px_rgba(0,130,230,0.25)]">Connessioni</span>
                            </h1>
                            <p className="text-white/40 font-semibold text-sm md:text-lg max-w-xl tracking-tight leading-snug">
                                Gestisci le tue richieste d'amicizia inviate e ricevute.
                            </p>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl md:rounded-[3rem] p-4 md:p-10 backdrop-blur-md min-h-[400px] glass-card">
                            <FriendRequestsPanel 
                                incoming={incomingRequests}
                                outgoing={outgoingRequests}
                                loading={loading}
                                onAccept={handleAcceptRequest}
                                onReject={handleRejectRequest}
                                onCancelSent={handleCancelSent}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white selection:bg-primary/30 overflow-x-hidden relative pb-20 -mt-20 pt-20">
            {/* Background Glows */}
            <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/10 blur-[180px] animate-pulse pointer-events-none" />
            <div className="absolute top-1/4 -right-32 w-80 h-80 bg-blue-500/10 blur-[150px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 md:py-20 space-y-8 md:space-y-16 pb-28 relative z-10">
                {/* Hero Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/5">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/60 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md shadow-2xl">
                            <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse shadow-[0_0_10px_rgba(226,243,60,0.8)]" />
                            <Sparkles className="w-3 h-3 text-brand-lime" />
                            Community Hub
                        </div>
                        <h1 className="text-4xl xs:text-5xl md:text-7xl font-black italic tracking-tighter leading-none font-display">
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-brand-lime drop-shadow-[0_0_40px_rgba(0,130,230,0.25)]">Esplora</span>
                            <span className="block text-white opacity-40">Social</span>
                        </h1>
                        <p className="text-white/40 font-semibold text-lg md:text-2xl max-w-xl tracking-tight leading-snug">
                            Scopri nuovi amici, scala la classifica e gestisci le tue connessioni nell'universo di Eversia.
                        </p>
                    </div>
                </div>

                {/* Centered Dashboard Layout */}
                <ScrollReveal className="max-w-4xl mx-auto space-y-8">
                    {/* Navigation Cards Grid (Asymmetric Bento Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Classifica Card (col-span-2) */}
                        <motion.button 
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => navigate('/social/leaderboard')}
                            onMouseMove={handleMouseMove}
                            className="spotlight-card group relative col-span-1 md:col-span-2 flex flex-col md:flex-row justify-between items-stretch p-6 bg-white/[0.015] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 text-left cursor-pointer min-h-[200px] backdrop-blur-md overflow-hidden glass-card"
                        >
                            {/* Left Text Side */}
                            <div className="flex flex-col justify-between items-start flex-1 pr-4 z-10">
                                <div>
                                    <span className="text-[10px] font-semibold tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                        Classifica XP
                                    </span>
                                    <h3 className="text-xl font-bold text-white mt-4 font-display group-hover:text-amber-400 transition-colors">
                                        Classifica Globale
                                    </h3>
                                    <p className="text-xs text-white/50 font-normal mt-2 leading-relaxed max-w-sm">
                                        Esplora i campioni del Liceo Agnesi. Partecipa alle assemblee e scala la vetta dei punti XP.
                                    </p>
                                </div>
                                <div className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:underline">
                                    Vedi la classifica <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>

                            {/* Right Podium Visual Mockup */}
                            <div className="flex items-end justify-center gap-3 pt-6 md:pt-0 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-white/5 shrink-0 z-10">
                                {/* 2nd Place */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 border border-slate-300/30 flex items-center justify-center text-white font-bold text-xs font-display shadow-lg shadow-slate-500/10 group-hover:scale-105 transition-transform duration-300">
                                        LM
                                    </div>
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        whileInView={{ height: 48 }}
                                        viewport={{ once: true }}
                                        transition={{ type: 'spring', delay: 0.1 }}
                                        className="w-12 bg-white/5 border border-white/10 rounded-t-lg flex items-center justify-center text-[10px] font-bold text-white/40"
                                    >
                                        2°
                                    </motion.div>
                                </div>

                                {/* 1st Place */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 border border-amber-300/30 flex items-center justify-center text-black font-extrabold text-sm font-display shadow-xl shadow-amber-500/20 group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300 animate-pulse">
                                        AN
                                    </div>
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        whileInView={{ height: 68 }}
                                        viewport={{ once: true }}
                                        transition={{ type: 'spring' }}
                                        className="w-14 bg-amber-500/10 border border-amber-500/20 rounded-t-lg flex items-center justify-center text-xs font-bold text-amber-400 shadow-[inset_0_1px_1px_rgba(251,191,36,0.1)]"
                                    >
                                        1°
                                    </motion.div>
                                </div>

                                {/* 3rd Place */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-700 to-orange-800 border border-amber-600/30 flex items-center justify-center text-white font-bold text-xs font-display shadow-lg shadow-orange-700/10 group-hover:scale-105 transition-transform duration-300">
                                        SM
                                    </div>
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        whileInView={{ height: 32 }}
                                        viewport={{ once: true }}
                                        transition={{ type: 'spring', delay: 0.2 }}
                                        className="w-10 bg-white/5 border border-white/10 rounded-t-lg flex items-center justify-center text-[10px] font-bold text-white/40"
                                    >
                                        3°
                                    </motion.div>
                                </div>
                            </div>
                            
                            {/* Subtle background visual grid */}
                            <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
                        </motion.button>

                        {/* Richieste Card (col-span-1) */}
                        <motion.button 
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => navigate('/social/requests')}
                            onMouseMove={handleMouseMove}
                            className="spotlight-card group relative col-span-1 flex flex-col justify-between items-start p-6 bg-white/[0.015] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 text-left cursor-pointer min-h-[200px] backdrop-blur-md glass-card overflow-hidden"
                        >
                            <div className="absolute right-6 top-6 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary group-hover:scale-105 transition-all">
                                <Bell className="w-5 h-5" />
                                {incomingRequests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                        {incomingRequests.length}
                                    </span>
                                )}
                            </div>
                            
                            {/* Top row label */}
                            <div>
                                <span className="text-[10px] font-semibold tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                                    Connessioni
                                </span>
                            </div>

                            {/* Center Avatar Pile visual */}
                            <div className="flex items-center gap-0 py-2 mt-4 pl-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shadow-lg shadow-primary/10 -ml-2 group-hover:translate-x-0 transition-transform duration-300 font-display">
                                    JD
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-lime/20 to-primary/20 border border-brand-lime/30 flex items-center justify-center text-[10px] font-bold text-brand-lime shadow-lg shadow-brand-lime/10 -ml-2 group-hover:translate-x-1 transition-transform duration-300 font-display">
                                    FB
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-400 shadow-lg shadow-emerald-500/10 -ml-2 group-hover:translate-x-2 transition-transform duration-300 font-display">
                                    GL
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-bold text-white/40 -ml-2 group-hover:translate-x-3 transition-transform duration-300 font-display">
                                    +3
                                </div>
                            </div>

                            {/* Bottom row descriptions */}
                            <div className="mt-4">
                                <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">Richieste d'Amicizia</h3>
                                <p className="text-[10px] text-white/40 font-semibold tracking-wide uppercase mt-1">
                                    {incomingRequests.length > 0 ? `${incomingRequests.length} in attesa` : 'Nessuna in sospeso'}
                                </p>
                            </div>
                        </motion.button>
                    </div>

                    {/* Search & Discovery Panel (Centered below) */}
                    <div className="space-y-4">
                        <SectionHeader icon={Search} label="Trova Amici" color="text-blue-400" />
                        <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md glass-card">
                            <div className="absolute -right-32 -bottom-32 w-96 h-96 bg-blue-500/[0.01] rounded-full blur-3xl pointer-events-none" />
                            <UserDiscovery />
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </div>
    );
};
