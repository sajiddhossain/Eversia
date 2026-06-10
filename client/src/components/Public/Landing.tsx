import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import type { Assembly, AppConfig } from '../../types';
import {
    Atom, Zap, Users,
    Layout, Lock, Activity,
    GraduationCap, LayoutDashboard, ShieldCheck, LogOut,
    Trophy, Award, Crown, ArrowRight,
    Flame, CheckCircle2, Sparkles, Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BrandName } from '../Common/BrandName';
import { calculateLevel, getLevelColor, xpProgress, getLevelName, calculateStreakXP } from '../../utils/gamification';
import { motion } from 'framer-motion';

// 2026 ScrollReveal Component
interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: string;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, className = '', delay = '0ms' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.05 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: delay }}
            className={`transition-all duration-1000 transform ${
                isVisible 
                    ? 'opacity-100 translate-y-0 filter-none' 
                    : 'opacity-0 translate-y-8 blur-[2px]'
            } ${className}`}
        >
            {children}
        </div>
    );
};

// 2026 Cursor spotlight hover tracker
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
};

const getStreakDate = (dateVal: any): Date => {
    if (!dateVal) return new Date(0);
    if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
        return new Date(dateVal.seconds * 1000);
    }
    if (typeof dateVal.toDate === 'function') {
        return dateVal.toDate();
    }
    return new Date(dateVal);
};

export const Landing: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile, isStaff, logout } = useAuth();
    const [activeAssembly, setActiveAssembly] = useState<Assembly | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [isLoadingTopUsers, setIsLoadingTopUsers] = useState(false);
    const [studentData, setStudentData] = useState<any | null>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    const isAdmin = ['SVILUPPATORE', 'ADMIN'].includes(userProfile?.role || '');
    const isAssemblyActive = !!(activeAssembly && (activeAssembly.status === 'ISCRIZIONI_APERTE' || activeAssembly.status === 'ATTIVA'));

    const [isClaiming, setIsClaiming] = useState(false);
    const [claimSuccess, setClaimSuccess] = useState(false);
    const [mobileTab, setMobileTab] = useState<'HUB' | 'STATS'>('HUB');


    const [activeDemoTurn, setActiveDemoTurn] = useState<'T1' | 'T2'>('T1');
    const [mockStreak, setMockStreak] = useState(5);
    const [mockXp, setMockXp] = useState(340);
    const [mockLevel] = useState(4);
    const [hasCheckedMockCheckIn, setHasCheckedMockCheckIn] = useState(false);

    const getStreakStatus = () => {
        if (!userProfile || !userProfile.lastStreakDate) return { active: false, broken: false };
        const lastDate = getStreakDate(userProfile.lastStreakDate);
        lastDate.setHours(0,0,0,0);
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0,0,0,0);
        
        const active = lastDate.getTime() >= yesterday.getTime();
        return { active, broken: !active };
    };

    const hasCheckedInToday = (() => {
        if (!userProfile || !userProfile.lastStreakDate) return false;
        const lastDate = getStreakDate(userProfile.lastStreakDate);
        const today = new Date();
        const sameDay = lastDate.getFullYear() === today.getFullYear() &&
                        lastDate.getMonth() === today.getMonth() &&
                        lastDate.getDate() === today.getDate();
        
        const diffMillis = today.getTime() - lastDate.getTime();
        const inCooldown = diffMillis < 8 * 60 * 60 * 1000;
        
        return sameDay || inCooldown;
    })();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buongiorno';
        if (hour < 18) return 'Buon pomeriggio';
        return 'Buonasera';
    };

    const getWeekDays = () => {
        const today = new Date();
        const currentDay = today.getDay();
        const mondayDiff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(mondayDiff);
        
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            days.push(date);
        }
        return days;
    };

    const isDateCheckedIn = (date: Date) => {
        if (!userProfile?.lastStreakDate || !userProfile?.streak) return false;
        
        const d = new Date(date);
        d.setHours(0,0,0,0);
        
        const lastCheckIn = getStreakDate(userProfile.lastStreakDate);
        lastCheckIn.setHours(0,0,0,0);
        
        const firstCheckIn = new Date(lastCheckIn);
        firstCheckIn.setDate(lastCheckIn.getDate() - (userProfile.streak - 1));
        firstCheckIn.setHours(0,0,0,0);
        
        return d.getTime() >= firstCheckIn.getTime() && d.getTime() <= lastCheckIn.getTime();
    };

    const handleDailyCheckIn = async () => {
        if (!userProfile || hasCheckedInToday || isClaiming) return;
        setIsClaiming(true);
        try {
            const userRef = doc(db, 'users', userProfile.uid);
            const { broken } = getStreakStatus();
            const newStreak = (broken || !userProfile.streak) ? 1 : userProfile.streak + 1;
            
            const totalXPGained = calculateStreakXP(newStreak);
            const newXP = (userProfile.xp || 0) + totalXPGained;
            const newLevel = calculateLevel(newXP);

            await updateDoc(userRef, {
                streak: newStreak,
                lastStreakDate: serverTimestamp(),
                xp: newXP,
                level: newLevel
            });

            setClaimSuccess(true);
            setTimeout(() => setClaimSuccess(false), 5000);
        } catch (error) {
            console.error("Daily check-in failed:", error);
        } finally {
            setIsClaiming(false);
        }
    };

    const isPermissionError = (err: any) => {
        if (!err) return false;
        const code = err.code || '';
        const msg = err.message || '';
        return code === 'permission-denied' || 
               code === 'firestore/permission-denied' ||
               msg.toLowerCase().includes('permission') ||
               msg.toLowerCase().includes('insufficient');
    };

    // Setup active assembly details listener - allowed for both authenticated users and guests (public rules)
    useEffect(() => {
        setIsLoading(true);
        let unsubscribeAssembly: (() => void) | null = null;

        const unsubscribeConfig = onSnapshot(doc(db, "config", "main"), (configSnap) => {
            if (configSnap.exists()) {
                const data = configSnap.data() as AppConfig;
                if (data.activeAssemblyId) {
                    if (unsubscribeAssembly) {
                        unsubscribeAssembly();
                    }
                    unsubscribeAssembly = onSnapshot(doc(db, "assemblies", data.activeAssemblyId), (snap) => {
                        if (snap.exists()) {
                            setActiveAssembly({ id: snap.id, ...snap.data() } as Assembly);
                        }
                        setIsLoading(false);
                    }, (err) => {
                        if (!isPermissionError(err)) {
                            console.error("Landing Assembly listener error:", err);
                        }
                        setIsLoading(false);
                    });
                } else {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        }, (err) => {
            if (!isPermissionError(err)) {
                console.error("Landing Config listener error:", err);
            }
            setIsLoading(false);
        });

        return () => {
            unsubscribeConfig();
            if (unsubscribeAssembly) {
                unsubscribeAssembly();
            }
        };
    }, []);

    // Setup top users listener (Leaderboard spotlight) - only for authenticated users due to security rules
    useEffect(() => {
        if (!userProfile) {
            setTopUsers([]);
            return;
        }

        setIsLoadingTopUsers(true);
        const q = query(
            collection(db, 'users'),
            orderBy('xp', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const users: any[] = [];
            snap.forEach((doc) => {
                const data = doc.data();
                users.push({
                    uid: doc.id,
                    displayName: data.displayName || 'Utente eversia',
                    username: data.username || '',
                    xp: data.xp || 0,
                    role: data.role || 'STUDENT',
                    badgeCount: data.earnedBadges?.length || 0,
                });
            });
            
            // Sort: XP descending, then badgeCount descending (tiebreaker)
            users.sort((a, b) => {
                if (b.xp !== a.xp) return b.xp - a.xp;
                return b.badgeCount - a.badgeCount;
            });

            setTopUsers(users.slice(0, 3));
            setIsLoadingTopUsers(false);
        }, (err) => {
            if (!isPermissionError(err)) {
                console.warn("Landing top users fetch error:", err);
            }
            setIsLoadingTopUsers(false);
        });

        return unsubscribe;
    }, [userProfile]);

    // Setup student registration and activities listeners
    useEffect(() => {
        if (!userProfile || !activeAssembly) {
            setStudentData(null);
            return;
        }

        const studentId = `${activeAssembly.id}_${userProfile.email}`;
        const unsubStudent = onSnapshot(doc(db, 'students', studentId), (snap) => {
            if (snap.exists()) {
                setStudentData({ id: snap.id, ...snap.data() });
            } else {
                // Try lowercase email fallback
                const studentIdLower = `${activeAssembly.id}_${userProfile.email.toLowerCase()}`;
                onSnapshot(doc(db, 'students', studentIdLower), (snap2) => {
                    if (snap2.exists()) {
                        setStudentData({ id: snap2.id, ...snap2.data() });
                    } else {
                        setStudentData(null);
                    }
                });
            }
        }, (err) => {
            if (!isPermissionError(err)) {
                console.error("Landing Student fetch error:", err);
            }
        });

        return unsubStudent;
    }, [userProfile, activeAssembly]);

    useEffect(() => {
        if (!activeAssembly) {
            setActivities([]);
            return;
        }
        const q = query(
            collection(db, 'rooms'),
            where('assemblyId', '==', activeAssembly.id)
        );
        const unsub = onSnapshot(q, (snap) => {
            const acts: any[] = [];
            snap.forEach(d => {
                acts.push({ id: d.id, ...d.data() });
            });
            setActivities(acts);
        }, (err) => {
            if (!isPermissionError(err)) {
                console.error("Landing Rooms fetch error:", err);
            }
        });
        return unsub;
    }, [activeAssembly]);

    // Fetch assembly roles dynamically for role-based administrative panels (UX Enhancement)
    useEffect(() => {
        if (!userProfile?.email) {
            setUserRoles([]);
            return;
        }
        
        const q = query(
            collection(db, 'assembly_roles'),
            where('email', '==', userProfile.email.toLowerCase())
        );
        
        const unsubscribe = onSnapshot(q, (snap) => {
            const roles = snap.docs.map(doc => doc.data().role as string);
            setUserRoles(roles);
        }, (err) => {
            if (!isPermissionError(err)) {
                console.error("Landing roles fetch error:", err);
            }
        });
        
        return unsubscribe;
    }, [userProfile?.email]);

    return (
        <div className="min-h-[calc(100vh+80px)] bg-surface text-white selection:bg-primary/30 relative overflow-x-hidden -mt-20 pt-20">
            {/* Background Aesthetics */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,rgba(226,243,60,0.05)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-10">
                <div className="flex flex-col items-center w-full">

                    {/* Authenticated View */}
                    {userProfile ? (
                        <div className="w-full max-w-5xl space-y-5 animate-in fade-in duration-500 text-left">
                            
                            {/* Spotify-style Greeting Header */}
                            <div className="space-y-1 pl-1">
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/20">Dashboard Hub</span>
                                <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-white leading-none">
                                    {getGreeting()}, {userProfile.displayName ? userProfile.displayName.split(' ')[0] : 'Studente'}! 👋
                                </h2>
                                <p className="text-[10px] font-semibold text-white/45 mt-1">
                                    {userProfile.streak && userProfile.streak > 0 ? (
                                        <span>
                                            Serie di check-in attiva: <span className="text-orange-400 font-bold tabular-nums">{userProfile.streak}</span> {userProfile.streak === 1 ? 'giorno' : 'giorni'} consecutivi! 🔥
                                        </span>
                                    ) : (
                                        'Nessun check-in oggi. Inizia la tua serie e guadagna XP!'
                                    )}
                                </p>
                            </div>

                            {/* Mobile Segmented Tab Controller */}
                            <div className="flex md:hidden p-1 bg-white/5 border border-white/10 rounded-2xl relative">
                                <button
                                    onClick={() => setMobileTab('HUB')}
                                    className={`flex-1 py-2.5 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all btn-press relative z-10 ${
                                        mobileTab === 'HUB' ? 'text-black font-bold' : 'text-white/40'
                                    }`}
                                >
                                    Il Mio Hub
                                    {mobileTab === 'HUB' && (
                                        <motion.div
                                            layoutId="activeTabMobile"
                                            className="absolute inset-0 bg-white rounded-xl shadow-lg -z-10"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => setMobileTab('STATS')}
                                    className={`flex-1 py-2.5 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all btn-press relative z-10 ${
                                        mobileTab === 'STATS' ? 'text-black font-bold' : 'text-white/40'
                                    }`}
                                >
                                    Progressi & Statistiche
                                    {mobileTab === 'STATS' && (
                                        <motion.div
                                            layoutId="activeTabMobile"
                                            className="absolute inset-0 bg-white rounded-xl shadow-lg -z-10"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            </div>

                            {/* Spotify-style Quick Access Cards */}
                            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                                {[
                                    {
                                        title: "La mia Agenda",
                                        shortTitle: "Agenda",
                                        desc: "Vedi prenotazioni ed orari",
                                        icon: <GraduationCap className="w-5 h-5 text-brand-lime" />,
                                        path: "/student",
                                        bg: "from-brand-lime/10 to-brand-lime/0"
                                    },
                                    {
                                        title: "Classifica Liceo",
                                        shortTitle: "Classifica",
                                        desc: "Confronta il tuo punteggio XP",
                                        icon: <Trophy className="w-5 h-5 text-yellow-400" />,
                                        path: "/social/leaderboard",
                                        bg: "from-yellow-500/10 to-yellow-500/0"
                                    },
                                    {
                                        title: "I Miei Traguardi",
                                        shortTitle: "Traguardi",
                                        desc: "Visualizza i tuoi badge sbloccati",
                                        icon: <Award className="w-5 h-5 text-fuchsia-400" />,
                                        path: "/profile",
                                        bg: "from-fuchsia-500/10 to-fuchsia-500/0"
                                    }
                                ].map((card, idx) => (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ scale: 1.015, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(card.path)}
                                        onMouseMove={handleMouseMove}
                                        className="relative overflow-hidden cursor-pointer flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-2xl transition-all group shadow-md text-center sm:text-left spotlight-card glass-card"
                                    >
                                        <div className={`absolute -right-4 -bottom-4 w-12 h-12 bg-gradient-to-br ${card.bg} rounded-full blur-xl group-hover:scale-125 transition-transform z-0`} />
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors shrink-0 z-10 relative">
                                            {card.icon}
                                        </div>
                                        <div className="min-w-0 z-10 relative">
                                            <h4 className="text-[9px] sm:text-xs font-display font-black text-white group-hover:text-primary transition-colors leading-none truncate uppercase sm:normal-case tracking-wider sm:tracking-normal">
                                                <span className="block sm:hidden">{card.shortTitle}</span>
                                                <span className="hidden sm:block">{card.title}</span>
                                            </h4>
                                            <p className="hidden sm:block text-[9px] font-medium text-white/40 mt-1.5 truncate">{card.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Main Hub Grid - Desktop: 2 Columns (3/5 and 2/5) */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 pt-1">
                                
                                {/* Left Side: Primary Booking & Agenda (Col-span 3) */}
                                <div className={`md:col-span-3 space-y-5 ${mobileTab === 'HUB' ? 'block' : 'hidden md:block'}`}>
                                    
                                    {/* Quick Access Staff/Admin Panel (UX Enhancement for Assembly Day) */}
                                    {(isStaff || isAdmin) && (
                                        <div className="space-y-3 animate-in fade-in duration-500">
                                            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/35 pl-1 flex items-center gap-1.5">
                                                <ShieldCheck className="w-3.5 h-3.5 text-brand-lime" />
                                                Pannello Operatore
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* Room Manager Action */}
                                                {userRoles.includes('ROOM_MANAGER') && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.01, y: -1 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        onClick={() => navigate('/staff')}
                                                        className="w-full p-4 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/35 text-emerald-400 rounded-2xl flex items-center justify-between transition-all group shadow-lg text-left cursor-pointer glass-card"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                                                                <Users className="w-5 h-5 text-emerald-400" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">Segna Presenze</h4>
                                                                <p className="text-[9px] font-medium text-white/40 mt-0.5">Gestisci appello e capienza aula</p>
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                    </motion.button>
                                                )}

                                                {/* Security Action */}
                                                {userRoles.includes('SECURITY') && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.01, y: -1 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        onClick={() => navigate('/staff')}
                                                        className="w-full p-4 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 hover:border-blue-500/35 text-blue-400 rounded-2xl flex items-center justify-between transition-all group shadow-lg text-left cursor-pointer glass-card"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                                                                <ShieldCheck className="w-5 h-5 text-blue-400" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">Supervisione</h4>
                                                                <p className="text-[9px] font-medium text-white/40 mt-0.5">Monitora flussi e controlli di sicurezza</p>
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                    </motion.button>
                                                )}

                                                {/* Admin Actions */}
                                                {isAdmin && (
                                                    <>
                                                        <motion.button
                                                            whileHover={{ scale: 1.01, y: -1 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            onClick={() => navigate('/staff')}
                                                            className="w-full p-4 bg-brand-lime/10 hover:bg-brand-lime/15 border border-brand-lime/20 hover:border-brand-lime/35 text-brand-lime rounded-2xl flex items-center justify-between transition-all group shadow-lg text-left cursor-pointer glass-card"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-brand-lime/20 flex items-center justify-center border border-brand-lime/20 group-hover:scale-105 transition-transform">
                                                                    <LayoutDashboard className="w-5 h-5 text-brand-lime" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">Dashboard Staff</h4>
                                                                    <p className="text-[9px] font-medium text-white/40 mt-0.5">Accedi ai comandi del personale</p>
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                        </motion.button>

                                                        <motion.button
                                                            whileHover={{ scale: 1.01, y: -1 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            onClick={() => navigate('/admin')}
                                                            className="w-full p-4 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 hover:border-purple-500/35 text-purple-400 rounded-2xl flex items-center justify-between transition-all group shadow-lg text-left cursor-pointer glass-card"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
                                                                    <Crown className="w-5 h-5 text-purple-400" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">Dashboard Admin</h4>
                                                                    <p className="text-[9px] font-medium text-white/40 mt-0.5">Pannello di controllo globale</p>
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                        </motion.button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Assembly Card */}
                                    {(() => {
                                        return (
                                            <div className="space-y-3">
                                                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/35 pl-1">Assemblea in Corso</h3>
                                                {isAssemblyActive ? (
                                                    <div 
                                                        onMouseMove={handleMouseMove}
                                                        className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden group shadow-lg spotlight-card glass-card"
                                                    >
                                                        <div className="absolute -left-12 -top-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors z-0" />

                                                        <div className="space-y-1.5 z-10 relative">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[9px] font-semibold tracking-wider text-white/40">Liceo M.G. Agnesi</span>
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                                        activeAssembly.status === 'ISCRIZIONI_APERTE' 
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                            : 'bg-primary/10 text-primary border border-primary/20 animate-pulse'
                                                                    }`}>
                                                                        {activeAssembly.status.replace(/_/g, ' ')}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Live Pulsing Beacon */}
                                                                <div className="flex items-center gap-1 bg-brand-lime/15 border border-brand-lime/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider live-beacon">
                                                                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-lime opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-lime"></span>
                                                                    </span>
                                                                    <span>Live</span>
                                                                </div>
                                                            </div>
                                                            <h2 className="text-xl font-display font-black text-white leading-tight mt-1.5">
                                                                {activeAssembly.name}
                                                            </h2>
                                                            {activeAssembly.description && (
                                                                <p className="text-[10px] text-white/40 max-w-xl font-medium leading-relaxed mt-1">
                                                                    {activeAssembly.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <motion.button
                                                            whileHover={{ scale: 1.015 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => navigate('/student')}
                                                            className="w-full h-12 bg-white hover:bg-white/90 text-black font-display font-black uppercase tracking-[0.15em] text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all z-10 relative shadow-[0_4px_20px_rgba(255,255,255,0.05)] cursor-pointer"
                                                        >
                                                            <GraduationCap className="w-4 h-4" />
                                                            {activeAssembly.status === 'ISCRIZIONI_APERTE' ? 'Prenota le Attività' : 'Vedi la mia Agenda'}
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </motion.button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-3.5 relative overflow-hidden group shadow-lg text-left glass-card">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/35">Stato Piattaforma</span>
                                                            <h2 className="text-sm font-display font-black text-white/50">Nessuna Assemblea Attiva</h2>
                                                            <p className="text-[10px] text-white/30 font-medium leading-relaxed mt-1">
                                                                Al momento non ci sono assemblee aperte alle prenotazioni o in corso di svolgimento. Ti invieremo una notifica non appena la prossima assemblea sarà configurata.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate('/student')}
                                                            className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                                                        >
                                                            Esplora Storico Assemblee
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Duolingo-style Connected Turn/Agenda Path */}
                                    {(() => {
                                        if (!isAssemblyActive || !studentData) return null;
                                        
                                        const sortedTurns = activeAssembly.turn_schedules && Object.keys(activeAssembly.turn_schedules).length > 0
                                            ? Object.keys(activeAssembly.turn_schedules).sort()
                                            : studentData.scheduled_turns && Object.keys(studentData.scheduled_turns).length > 0
                                                ? Object.keys(studentData.scheduled_turns).sort()
                                                : [];

                                        const hasBookings = sortedTurns.some((t: string) => !!studentData.scheduled_turns?.[t]);
                                        if (sortedTurns.length === 0 || !hasBookings) return null;

                                        return (
                                            <div className="space-y-3">
                                                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/35 pl-1">Il Tuo Percorso di Oggi</h3>
                                                <div className="relative pl-6 border-l border-white/5 space-y-4 py-1.5 ml-4">
                                                    {sortedTurns.map((turnId: string) => {
                                                        const activityId = studentData.scheduled_turns?.[turnId];
                                                        if (!activityId) return null; // Only show booked activities in timeline
                                                        const activity = activities.find(a => a.id === activityId);
                                                        const checkedIn = studentData.actual_location?.[turnId]?.checked_in;
                                                        const schedule = activeAssembly.turn_schedules?.[turnId];
                                                        const turnName = turnId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                                                        return (
                                                            <div key={turnId} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                                                                {/* Connected timeline bullet */}
                                                                <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                                                                    checkedIn 
                                                                        ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                                                                        : 'bg-surface border-primary shadow-[0_0_8px_rgba(0,130,230,0.3)] animate-pulse'
                                                                }`}>
                                                                    {checkedIn && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                                </div>

                                                                {/* Activity details card */}
                                                                <motion.div 
                                                                    whileHover={{ scale: 1.01, x: 1 }}
                                                                    whileTap={{ scale: 0.99 }}
                                                                    onClick={() => navigate('/student')}
                                                                    className="flex-1 cursor-pointer p-3 sm:p-3.5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group/card shadow-sm glass-card"
                                                                >
                                                                    <div className="space-y-1 text-left">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black uppercase tracking-wider text-white/30">{turnName}</span>
                                                                            {schedule && (
                                                                                <span className="text-[8px] font-black uppercase bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50 tabular-nums">
                                                                                    {schedule.start} - {schedule.end}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <h4 className="text-sm font-display font-black text-white group-hover/card:text-primary transition-colors leading-snug">
                                                                            {activity ? activity.name : 'Caricamento attività...'}
                                                                        </h4>
                                                                        {activity?.location_name && (
                                                                            <p className="text-[10px] font-medium text-white/40 flex items-center gap-1.5 mt-0.5">
                                                                                 <span>📍 {activity.location_name}</span>
                                                                                 {activity.room_name && <span>• {activity.room_name}</span>}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div className="shrink-0 flex items-center gap-2">
                                                                        {checkedIn ? (
                                                                            <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full">
                                                                                Presente
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full group-hover/card:bg-primary group-hover/card:text-white transition-all">
                                                                                Prenotato
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Additional info when no assembly is active to balance layout */}
                                    {!isAssemblyActive && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                                            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/35 pl-1">Cosa puoi fare ora?</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                                                {[
                                                    {
                                                        title: "Trova i tuoi Compagni",
                                                        desc: "Cerca i compagni di classe, visualizza i loro profili e invia richieste di amicizia.",
                                                        icon: <Users className="w-4 h-4 text-blue-400" />,
                                                        actionText: "Esplora Community",
                                                        path: "/social"
                                                    },
                                                    {
                                                        title: "Il Tuo Profilo Unico",
                                                        desc: "Personalizza il tuo username, controlla i tuoi badge sbloccati e monitora i tuoi XP.",
                                                        icon: <Sparkles className="w-4 h-4 text-fuchsia-400" />,
                                                        actionText: "Modifica Profilo",
                                                        path: "/profile"
                                                    },
                                                    {
                                                        title: "Come Funzionano i Livelli?",
                                                        desc: "Fai il check-in giornaliero e partecipa alle attività per raccogliere XP e salire di livello.",
                                                        icon: <Flame className="w-4 h-4 text-orange-400" />,
                                                        actionText: "Classifica Completa",
                                                        path: "/social/leaderboard"
                                                    },
                                                    {
                                                        title: "Storico Assemblee",
                                                        desc: "Sfoglia l'archivio storico delle assemblee passate del Liceo M.G. Agnesi.",
                                                        icon: <GraduationCap className="w-4 h-4 text-brand-lime" />,
                                                        actionText: "Archivio",
                                                        path: "/student"
                                                    }
                                                ].map((item, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between gap-3 shadow-md hover:bg-white/[0.03] transition-all text-left glass-card"
                                                    >
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                                    {item.icon}
                                                                </div>
                                                                <h4 className="text-[10px] sm:text-xs font-display font-black text-white">{item.title}</h4>
                                                            </div>
                                                            <p className="hidden sm:block text-[10px] text-white/30 font-medium leading-relaxed">
                                                                {item.desc}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate(item.path)}
                                                            className="w-full h-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer"
                                                        >
                                                            {item.actionText}
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Right Side: Champions Spotlight & Stats Sidebar (Col-span 2) */}
                                <div className={`md:col-span-2 space-y-5 ${mobileTab === 'STATS' ? 'block' : 'hidden md:block'}`}>
                                    
                                    {/* Duolingo-style Streak & Progression Card */}
                                    {(() => {
                                        const level = userProfile.xp ? calculateLevel(userProfile.xp) : 1;
                                        const levelColor = getLevelColor(level);
                                        const levelName = getLevelName(level);
                                        const { current, needed, percent } = xpProgress(userProfile.xp || 0);
                                        const streakCount = userProfile.streak || 0;
                                        const { broken } = getStreakStatus();

                                        return (
                                            <div className="space-y-3">
                                                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/35 pl-1">Obiettivi & Streak</h3>
                                                <div className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-5 shadow-xl space-y-3.5 relative overflow-hidden group glass-card">
                                                    <div className="absolute right-0 bottom-0 w-48 h-48 bg-orange-500/[0.01] rounded-full blur-3xl pointer-events-none" />
                                                    
                                                    {/* Streak Status */}
                                                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                        <div className="flex items-center gap-3">
                                                            <Flame className="w-9 h-9 text-orange-500 fill-orange-500/80 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                                            <div className="text-left">
                                                                <h4 className="text-lg font-display font-black text-white leading-none tabular-nums">
                                                                    {streakCount} {streakCount === 1 ? 'Giorno' : 'Giorni'}
                                                                </h4>
                                                                <p className="text-[9px] font-black uppercase tracking-wider text-orange-400 mt-1">
                                                                    {broken ? 'Inizia oggi!' : 'Serie attiva! 🔥'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${levelColor} text-black font-display font-black text-[8px] uppercase tracking-widest`}>
                                                            {levelName} • Lvl {level}
                                                        </div>
                                                    </div>

                                                    {/* Calendar Row */}
                                                    <div className="flex justify-between gap-1 py-1">
                                                        {getWeekDays().map((date, idx) => {
                                                            const checked = isDateCheckedIn(date);
                                                            const isToday = date.toDateString() === new Date().toDateString();
                                                            const dayName = ['D', 'L', 'M', 'M', 'G', 'V', 'S'][date.getDay()];
                                                            return (
                                                                <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                                                                    <span className={`text-[7px] font-black ${isToday ? 'text-orange-400' : 'text-white/20'}`}>
                                                                        {dayName}
                                                                    </span>
                                                                    <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center border text-[8px] font-display font-black transition-all ${
                                                                        checked 
                                                                            ? 'bg-gradient-to-br from-orange-400 to-amber-500 border-transparent shadow-[0_0_8px_rgba(249,115,22,0.3)] text-white' 
                                                                            : isToday && !hasCheckedInToday
                                                                                ? 'border-orange-500/50 border-dashed animate-pulse text-orange-400 font-bold' 
                                                                                : 'bg-white/5 border-white/10 text-white/25'
                                                                    }`}>
                                                                        {checked ? (
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[3]" />
                                                                        ) : (
                                                                            <span className="tabular-nums">{date.getDate()}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* XP Progress Bar */}
                                                    <div className="space-y-1 border-t border-white/5 pt-3 text-left">
                                                        <div className="flex justify-between items-end text-[8px] font-black uppercase tracking-wider text-white/40">
                                                            <span>XP Totali: <span className="tabular-nums font-bold">{userProfile.xp || 0}</span></span>
                                                            <span className="tabular-nums">{current}/{needed} XP per Liv. {level + 1}</span>
                                                        </div>
                                                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px] relative">
                                                            <div 
                                                                className={`h-full rounded-full bg-gradient-to-r ${levelColor} transition-all duration-1000 ease-out`}
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Daily Check-in claim button */}
                                                    <div className="pt-2">
                                                        {claimSuccess ? (
                                                            <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider animate-in zoom-in-95 duration-200">
                                                                <Sparkles className="w-3.5 h-3.5 animate-bounce text-emerald-400" />
                                                                Check-in completato! +{calculateStreakXP(userProfile?.streak || 1)} XP
                                                            </div>
                                                        ) : hasCheckedInToday ? (
                                                            <div className="w-full py-3 bg-white/5 border border-white/10 text-white/40 rounded-2xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                                Riscattato Oggi
                                                            </div>
                                                        ) : (
                                                            <motion.button
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                onClick={handleDailyCheckIn}
                                                                disabled={isClaiming}
                                                                className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-display font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer"
                                                            >
                                                                {isClaiming ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Flame className="w-3.5 h-3.5 text-white" />
                                                                        Riscatta la Streak di Oggi
                                                                    </>
                                                                )}
                                                            </motion.button>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Champions Leaderboard */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between pl-1">
                                            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/35 flex items-center gap-1.5">
                                                <Crown className="w-3.5 h-3.5 text-yellow-400" />
                                                I Campioni del Liceo
                                            </h3>
                                            <button 
                                                onClick={() => navigate('/social/leaderboard')} 
                                                className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1 group cursor-pointer"
                                            >
                                                Vedi Tutti
                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                            </button>
                                        </div>

                                        <div className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-4 shadow-xl space-y-2 glass-card">
                                            {isLoadingTopUsers ? (
                                                [...Array(3)].map((_, index) => (
                                                    <div key={index} className="h-12 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
                                                ))
                                            ) : topUsers.length > 0 ? (
                                                topUsers.map((user, index) => {
                                                    const isFirst = index === 0;
                                                    const isSecond = index === 1;
                                                    const rankColor = isFirst ? 'text-yellow-400 border-yellow-400/30' : isSecond ? 'text-slate-300 border-slate-300/30' : 'text-amber-600 border-amber-600/30';
                                                    const rankBg = isFirst ? 'bg-yellow-400/5' : isSecond ? 'bg-slate-300/5' : 'bg-amber-600/5';
                                                    const userLvl = calculateLevel(user.xp);
                                                    const userLvlColor = getLevelColor(userLvl);
                                                    
                                                    // Highlight first place with dynamic border styling
                                                    const goldBorder = isFirst ? 'border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.1)] bg-yellow-500/[0.01]' : '';

                                                    return (
                                                        <motion.div 
                                                            key={user.uid}
                                                            whileHover={{ scale: 1.01, x: 1 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            onClick={() => user.username ? navigate(`/profile/${user.username}`) : navigate(`/profile/uid/${user.uid}`)}
                                                            className={`cursor-pointer p-2.5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 transition-all group ${goldBorder}`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-display font-black text-[10px] border ${rankColor} ${rankBg} shrink-0 tabular-nums`}>
                                                                    {isFirst ? <Crown className="w-3.5 h-3.5 text-yellow-400" /> : (index + 1)}
                                                                </div>
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-6 h-6 rounded-lg p-[1px] bg-gradient-to-br ${userLvlColor} shrink-0`}>
                                                                        <div className="w-full h-full rounded-[5px] bg-surface flex items-center justify-center text-white/50 text-[8px] font-display font-black uppercase">
                                                                            {user.displayName.charAt(0)}
                                                                        </div>
                                                                    </div>
                                                                    <div className="min-w-0 text-left">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="font-display font-black text-[10px] text-white leading-none group-hover:text-primary transition-colors truncate">
                                                                                {user.displayName}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[7px] font-bold text-white/20 block truncate mt-0.5">
                                                                            {user.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : 'senza username'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <span className="text-[10px] font-black text-primary uppercase tracking-wider tabular-nums">{user.xp} XP</span>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-4 text-center rounded-2xl bg-white/[0.01] border border-white/5 text-white/30 text-[10px]">
                                                    Nessuno studente in classifica.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Logout Action inside column to save space */}
                                    <div className="pt-1">
                                        <button
                                            onClick={logout}
                                            className="w-full h-10 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            Esci dall'account
                                        </button>
                                    </div>

                                </div>

                            </div>

                        </div>
                    ) : (
                                            <div className="flex flex-col items-center text-center space-y-8 w-full max-w-5xl">
                            
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <Atom className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-semibold text-white/50 tracking-wider">Liceo Maria Gaetana Agnesi</span>
                            </div>
                            
                            {/* Hero Section */}
                            <div className="space-y-4 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                <h1 className="text-6xl sm:text-8xl md:text-9xl font-display font-black tracking-tighter leading-tight select-none">
                                    <BrandName variant="hero" className="brand-eversia-shimmer" />
                                </h1>
                                <p className="text-white/40 text-sm sm:text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed border-l-2 border-white/5 pl-4 sm:pl-6 text-wrap-pretty">
                                    L'ecosistema digitale per le assemblee del Liceo M.G. Agnesi.<br />
                                    <span className="text-white/60">Gestione, Social e Gamification in un'unica piattaforma.</span>
                                </p>
                            </div>

                            {/* Action CTAs Group */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center animate-in fade-in zoom-in-95 duration-700 delay-300">
                                <motion.button
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/login')}
                                    className="w-full sm:w-auto px-8 h-14 bg-white text-black rounded-2xl font-display font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.1)] group cursor-pointer"
                                >
                                    <Lock className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    Accedi al Portale
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/student')}
                                    className="w-full sm:w-auto px-8 h-14 bg-white/5 border border-white/10 text-white rounded-2xl font-display font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all hover:bg-white/10 group cursor-pointer"
                                >
                                    <Activity className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                                    Sfoglia come Ospite
                                </motion.button>
                            </div>

                            {/* Active Assembly indicator */}
                            {!isLoading && isAssemblyActive && activeAssembly && (
                                <motion.div 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/student')}
                                    className="cursor-pointer inline-flex items-center gap-2.5 px-4.5 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/30 rounded-full text-emerald-400 animate-in fade-in duration-700 delay-400 hover:bg-emerald-500/15 transition-all shadow-md shadow-emerald-500/5"
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">
                                        Assemblea in Corso: <span className="text-white font-bold">{activeAssembly.name}</span>
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                                </motion.div>
                            )}

                            {!isLoading && !isAssemblyActive && (
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/30 animate-in fade-in duration-700 delay-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Nessuna Assemblea Attiva</span>
                                </div>
                            )}

                            {/* Dashboard Mockup Preview (Linear/Vercel style) */}
                            <ScrollReveal className="hidden md:block w-full max-w-4xl mt-6">
                                <div 
                                    onMouseMove={handleMouseMove}
                                    className="w-full bg-white/[0.01] border border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-2xl backdrop-blur-md spotlight-card text-left glass-card"
                                >
                                    {/* Atmospheric gradients behind mockup */}
                                    <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/10 transition-colors z-0" />
                                    <div className="absolute bottom-0 left-1/4 w-[250px] h-[250px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

                                    {/* Mockup Header/Controls */}
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em] ml-2">EVERSIA HUB // LIVE PORTAL</span>
                                        </div>
                                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-white/40">
                                            Demo View
                                        </div>
                                    </div>

                                    {/* Mockup Content Grid */}
                                    <div className="grid grid-cols-3 gap-4 text-left relative z-10">
                                        {/* Mock Timeline */}
                                        <div className="p-4 rounded-2xl bg-[#09090b]/80 border border-white/5 space-y-3.5 relative z-10 backdrop-blur-md">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/35 block">Agenda Giornaliera</span>
                                                <div className="flex gap-1.5">
                                                    <button 
                                                        onClick={() => setActiveDemoTurn('T1')}
                                                        className={`px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider uppercase transition-all cursor-pointer ${activeDemoTurn === 'T1' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                                    >
                                                        T1
                                                    </button>
                                                    <button 
                                                        onClick={() => setActiveDemoTurn('T2')}
                                                        className={`px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider uppercase transition-all cursor-pointer ${activeDemoTurn === 'T2' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                                    >
                                                        T2
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative pl-4 border-l border-white/5 space-y-4">
                                                <div 
                                                    onClick={() => setActiveDemoTurn('T1')}
                                                    className={`relative cursor-pointer transition-all duration-300 ${activeDemoTurn === 'T1' ? 'scale-[1.02] translate-x-0.5' : 'opacity-50 hover:opacity-75'}`}
                                                >
                                                    <div className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full border border-surface transition-all ${activeDemoTurn === 'T1' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/40'}`} />
                                                    <div className="space-y-0.5">
                                                        <span className={`text-[7px] font-black uppercase transition-colors ${activeDemoTurn === 'T1' ? 'text-emerald-400' : 'text-emerald-400/50'}`}>T1 • 09:00</span>
                                                        <p className="text-[10px] font-black text-white leading-tight">Robotica & AI</p>
                                                        <span className="text-[8px] font-medium text-white/30 block">📍 Lab di Fisica</span>
                                                    </div>
                                                </div>
                                                <div 
                                                    onClick={() => setActiveDemoTurn('T2')}
                                                    className={`relative cursor-pointer transition-all duration-300 ${activeDemoTurn === 'T2' ? 'scale-[1.02] translate-x-0.5' : 'opacity-50 hover:opacity-75'}`}
                                                >
                                                    <div className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full border border-surface transition-all ${activeDemoTurn === 'T2' ? 'bg-primary shadow-[0_0_8px_rgba(0,130,230,0.5)]' : 'bg-primary/40'}`} />
                                                    <div className="space-y-0.5">
                                                        <span className={`text-[7px] font-black uppercase transition-colors ${activeDemoTurn === 'T2' ? 'text-primary' : 'text-primary/50'}`}>T2 • 10:30</span>
                                                        <p className="text-[10px] font-black text-white leading-tight">Torneo Scacchi</p>
                                                        <span className="text-[8px] font-medium text-white/30 block">📍 Aula Magna</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mock Leaderboard */}
                                        <div className="p-4 rounded-2xl bg-[#09090b]/80 border border-white/5 space-y-3.5 relative z-10 backdrop-blur-md">
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/35 block">Top Studenti (XP)</span>
                                            <div className="space-y-2">
                                                {[
                                                    { rank: 1, name: "Federico Rossi", xp: 1420 },
                                                    { rank: 2, name: "Elena Bianchi", xp: 1250 },
                                                    { rank: 3, name: "Sajid Hossain", xp: 1180 }
                                                ].map((u) => (
                                                    <div key={u.rank} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-black ${u.rank === 1 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-white/5 text-white/30'}`}>
                                                                {u.rank}
                                                            </span>
                                                            <span className="text-[9px] font-black text-white truncate leading-none">{u.name}</span>
                                                        </div>
                                                        <span className="text-[8px] font-black text-primary shrink-0">{u.xp} XP</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Mock Gamification */}
                                        <div className="p-4 rounded-2xl bg-[#09090b]/80 border border-white/5 space-y-3 relative z-10 backdrop-blur-md">
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/35 block">Progressione</span>
                                            <div 
                                                onClick={() => {
                                                    if (!hasCheckedMockCheckIn) {
                                                        setMockStreak(prev => prev + 1);
                                                        setMockXp(prev => prev + 15);
                                                        setHasCheckedMockCheckIn(true);
                                                    }
                                                }}
                                                className={`flex justify-between items-center bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl transition-all cursor-pointer hover:border-orange-500/20 active:scale-[0.98] group/item ${hasCheckedMockCheckIn ? 'bg-emerald-500/5 hover:border-emerald-500/10 border-emerald-500/20' : ''}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Flame className={`w-5 h-5 transition-all ${hasCheckedMockCheckIn ? 'text-emerald-500 fill-emerald-500/40 animate-bounce' : 'text-orange-500 fill-orange-500 group-hover/item:scale-110'}`} />
                                                    <div className="leading-none text-left">
                                                        <span className="text-[9px] font-black text-white block">{mockStreak} Giorni</span>
                                                        <span className={`text-[7px] font-black uppercase mt-0.5 block ${hasCheckedMockCheckIn ? 'text-emerald-400' : 'text-orange-400'}`}>
                                                            {hasCheckedMockCheckIn ? 'Riscattato!' : 'Riscatta Streak'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-brand-lime to-emerald-400 text-black text-[7px] font-black uppercase tracking-wider">
                                                    Lvl {mockLevel}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[7px] font-black uppercase tracking-wider text-white/30">
                                                    <span>Esperienza</span>
                                                    <span>{mockXp} / 500 XP</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                                                    <div 
                                                        className="h-full rounded-full bg-gradient-to-r from-brand-lime to-emerald-400 transition-all duration-500" 
                                                        style={{ width: `${(mockXp / 500) * 100}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Feature Bento Grid */}
                            <ScrollReveal className="w-full max-w-5xl mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full auto-rows-auto md:auto-rows-[160px]">
                                    
                                    {/* Card 1: Social Community (Col span 2, row span 1) */}
                                    <div 
                                        onMouseMove={handleMouseMove}
                                        className="md:col-span-2 md:row-span-1 p-6 rounded-3xl bg-white/[0.01] border border-white/5 text-left flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.03] transition-all group spotlight-card relative overflow-hidden glass-card"
                                    >
                                        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors z-0" />
                                        
                                        <div className="space-y-2 z-10 relative flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                                                    <Users className="w-4 h-4 text-primary" />
                                                </div>
                                                <h3 className="font-display font-black tracking-tight text-base text-white">Social Community</h3>
                                            </div>
                                            <p className="text-xs text-white/40 font-medium leading-relaxed max-w-md mt-1">
                                                Connettiti con i compagni del Liceo, gestisci amicizie, visualizza classifiche e scopri nuovi profili per arricchire la tua esperienza scolastica.
                                            </p>
                                        </div>
                                        
                                        {/* Micro UI Preview: Floating user pills */}
                                        <div className="z-10 relative flex gap-2 items-center shrink-0 bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/5 self-start md:self-auto">
                                            <div className="flex -space-x-2.5">
                                                <div className="w-7 h-7 rounded-lg p-[1px] bg-gradient-to-br from-brand-lime to-emerald-400">
                                                    <div className="w-full h-full rounded-[6px] bg-surface flex items-center justify-center text-[9px] font-black">E</div>
                                                </div>
                                                <div className="w-7 h-7 rounded-lg p-[1px] bg-gradient-to-br from-blue-400 to-primary">
                                                    <div className="w-full h-full rounded-[6px] bg-surface flex items-center justify-center text-[9px] font-black">M</div>
                                                </div>
                                                <div className="w-7 h-7 rounded-lg p-[1px] bg-gradient-to-br from-fuchsia-400 to-purple-500">
                                                    <div className="w-full h-full rounded-[6px] bg-surface flex items-center justify-center text-[9px] font-black">S</div>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-bold text-white/50 tracking-wide max-w-[120px] leading-tight">
                                                Elena, Marco e altri 420+ attivi
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card 2: Badge & Livelli (Col span 1, row span 2) */}
                                    <div 
                                        onMouseMove={handleMouseMove}
                                        className="md:col-span-1 md:row-span-2 p-6 rounded-3xl bg-white/[0.01] border border-white/5 text-left flex flex-col justify-between hover:bg-white/[0.03] transition-all group spotlight-card relative overflow-hidden glass-card"
                                    >
                                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-lime/5 rounded-full blur-2xl group-hover:bg-brand-lime/10 transition-colors z-0" />
                                        
                                        <div className="space-y-2.5 z-10 relative">
                                            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-brand-lime/30 transition-colors">
                                                <Zap className="w-5 h-5 text-brand-lime" />
                                            </div>
                                            <div>
                                                <h3 className="font-display font-black tracking-tight text-lg text-white">Badge & Livelli</h3>
                                                <p className="text-xs text-white/40 font-medium leading-relaxed mt-1">
                                                    Partecipa attivamente alle assemblee d'istituto, effettua il check-in giornaliero e accumula XP per salire di livello e sbloccare badge esclusivi da mostrare nel tuo profilo.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Micro UI Preview: XP Progress bar & Streak badge */}
                                        <div className="z-10 relative space-y-2 mt-4 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/5 w-full">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-brand-lime">
                                                <span>Check-in Streak</span>
                                                <span className="flex items-center gap-0.5">🔥 5 Giorni</span>
                                            </div>
                                            <div className="space-y-1 text-left">
                                                <div className="flex justify-between text-[7px] font-bold text-white/30">
                                                    <span>Lvl 4 Studente</span>
                                                    <span>340 / 500 XP</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-brand-lime to-emerald-400 w-[68%]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 3: Esplora come Ospite (Col span 2, row span 1) */}
                                    <div 
                                        onMouseMove={handleMouseMove}
                                        className="md:col-span-2 md:row-span-1 p-6 rounded-3xl bg-white/[0.01] border border-white/5 text-left flex flex-row items-center justify-between hover:bg-white/[0.03] transition-all group spotlight-card relative overflow-hidden glass-card"
                                    >
                                        <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none z-0" />
                                        
                                        <div className="space-y-2 z-10 relative pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-400/30 transition-colors">
                                                    <Layout className="w-4 h-4 text-emerald-400" />
                                                </div>
                                                <h3 className="font-display font-black tracking-tight text-base text-white">Esplora come Ospite</h3>
                                            </div>
                                            <p className="text-xs text-white/40 font-medium leading-relaxed max-w-md mt-1">
                                                Visualizza le assemblee configurate, sfoglia le aule e scopri il catalogo completo delle attività in corso anche senza account.
                                            </p>
                                        </div>

                                        <button 
                                            onClick={() => navigate('/student')}
                                            className="shrink-0 px-4 h-11 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl font-black uppercase tracking-wider text-[9px] flex items-center gap-1.5 transition-all active:scale-[0.98] z-10 cursor-pointer"
                                        >
                                            Sfoglia
                                            <ArrowRight className="w-3 h-3 text-white/60 group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>

                                </div>
                            </ScrollReveal>
                        </div>
                    )}
                </div>
            </main>



            {/* Ephemeral Check-In Success Visual Popup */}
            {claimSuccess && (
                <div 
                    onClick={() => setClaimSuccess(false)}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="relative bg-[#09090b]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 cursor-default"
                    >
                        {/* Glowing backdrop glow */}
                        <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-2xl pointer-events-none" />
                        
                        {/* Close Button / Auto timer indicator */}
                        <button 
                            onClick={() => setClaimSuccess(false)}
                            className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors cursor-pointer"
                        >
                            Chiudi
                        </button>

                        <div className="space-y-4">
                            {/* Pulsing Flame icon */}
                            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                                <div className="absolute inset-0 bg-orange-500/25 blur-xl rounded-full scale-125 animate-pulse" />
                                <div className="relative w-16 h-16 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10">
                                    <Flame className="w-10 h-10 text-orange-500 fill-orange-500 animate-bounce" />
                                </div>
                            </div>

                            {/* Congratulatory message */}
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">DAILY CHECK-IN</span>
                                <h3 className="text-xl font-black text-white leading-tight">Giorno {userProfile?.streak || 1} Confermato!</h3>
                                <p className="text-[10px] text-white/50 font-medium">Continua così per mantenere attiva la tua serie!</p>
                            </div>

                            {/* Stats pill */}
                            <div className="py-2.5 px-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between text-left">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-white/70">XP Guadagnati</span>
                                </div>
                                <span className="text-xs font-black text-emerald-400">
                                    +{calculateStreakXP(userProfile?.streak || 1)} XP
                                </span>
                            </div>

                            {/* Level Progress */}
                            {(() => {
                                const level = userProfile?.xp ? calculateLevel(userProfile.xp) : 1;
                                const { current, needed, percent } = xpProgress(userProfile?.xp || 0);
                                const levelColor = getLevelColor(level);
                                return (
                                    <div className="space-y-1.5 text-left border-t border-white/5 pt-3">
                                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider text-white/40">
                                            <span>Livello {level}</span>
                                            <span>{current}/{needed} XP</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                                            <div 
                                                className={`h-full rounded-full bg-gradient-to-r ${levelColor} transition-all duration-500`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
