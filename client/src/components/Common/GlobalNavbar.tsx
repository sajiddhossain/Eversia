import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
    Dna, GraduationCap, LayoutDashboard, Users, Home, LogOut, 
    ChevronDown, User, Bell, Settings, ShieldCheck, Construction, 
    Lock, Flame, CheckCircle2, Sparkles, Loader2,
    Award, Star, Zap, Gem, Trophy, Crown, Heart, Shield, Target
} from 'lucide-react';
import { UserRoleBadge } from './UserRoleBadge';
import { BrandName } from './BrandName';
import { calculateLevel, getLevelColor, xpProgress, RARITY_CONFIG, calculateStreakXP } from '../../utils/gamification';
import type { BadgeTemplate } from '../../types';
import { getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

const ICON_MAP: Record<string, React.ElementType> = {
    Award, Star, Zap, Gem, Trophy, Crown, Heart, Shield, Target,
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

interface GlobalNavbarProps {
    onSecretTrigger?: () => void;
}

export const GlobalNavbar: React.FC<GlobalNavbarProps> = ({ onSecretTrigger }) => {
    const { userProfile, user, isStaff, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isStreakMenuOpen, setIsStreakMenuOpen] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimSuccess, setClaimSuccess] = useState(false);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [unlockedBadge, setUnlockedBadge] = useState<BadgeTemplate | null>(null);
    const prevBadgesCountRef = useRef<number>(0);

    // Watch for new badges awarded by the backend
    useEffect(() => {
        if (!userProfile) return;
        const currentCount = userProfile.earnedBadges?.length || 0;
        
        if (prevBadgesCountRef.current > 0 && currentCount > prevBadgesCountRef.current) {
            // Un nuovo badge è stato aggiunto dal backend!
            const newBadgeId = userProfile.earnedBadges[currentCount - 1].badgeId;
            // Fetch the badge details
            getDoc(doc(db, 'badges', newBadgeId)).then(snap => {
                if (snap.exists()) {
                    setUnlockedBadge({ id: snap.id, ...snap.data() } as BadgeTemplate);
                    setTimeout(() => setUnlockedBadge(null), 6000);
                }
            }).catch(e => console.error("Error fetching newly unlocked badge:", e));
        }
        
        prevBadgesCountRef.current = currentCount;
    }, [userProfile?.earnedBadges]);
    
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const streakMenuRef = useRef<HTMLDivElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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

    const getWeekDays = () => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, ...
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

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Maintenance Mode listener
    useEffect(() => {
        if (!user) {
            setMaintenanceMode(false);
            return;
        }
        const unsub = onSnapshot(doc(db, "config", "main"), (snap) => {
            if (snap.exists()) setMaintenanceMode(!!snap.data().maintenance_mode);
        }, (error) => {
            const err = error as any;
            const code = err.code || '';
            const msg = err.message || '';
            const isPermissionErr = code === 'permission-denied' || 
                                   code === 'firestore/permission-denied' ||
                                   msg.toLowerCase().includes('permission') ||
                                   msg.toLowerCase().includes('insufficient');
            if (!isPermissionErr) {
                console.error("[Navbar] Maintenance config listener error:", error);
            }
        });
        return () => unsub();
    }, [user]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (streakMenuRef.current && !streakMenuRef.current.contains(event.target as Node)) {
                setIsStreakMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Real-time friend requests listener
    useEffect(() => {
        if (!userProfile?.uid) {
            setPendingRequestsCount(0);
            return;
        }

        const q = query(
            collection(db, 'friendRequests'),
            where('to', '==', userProfile.uid),
            where('status', '==', 'PENDING')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            setPendingRequestsCount(snap.docs.length);
        }, (error) => {
            const err = error as any;
            const code = err.code || '';
            const msg = err.message || '';
            const isPermissionErr = code === 'permission-denied' || 
                                   code === 'firestore/permission-denied' ||
                                   msg.toLowerCase().includes('permission') ||
                                   msg.toLowerCase().includes('insufficient');
            if (!isPermissionErr) {
                console.warn("[Navbar] Friend requests listener error:", error);
            }
            setPendingRequestsCount(0);
        });

        return () => unsubscribe();
    }, [userProfile?.uid]);

    const isAdmin = userProfile?.role === 'SVILUPPATORE' || userProfile?.role === 'ADMIN';

    // Keyboard Shortcut (Ctrl+Shift+K) for CCO
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'K') {
                if (isAdmin) {
                    onSecretTrigger?.();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAdmin, onSecretTrigger]);

    const formatRole = (role: string) => {
        if (role === 'SVILUPPATORE') return 'SVILUPPATORE';
        if (role === 'ADMIN') return 'Admin';
        return role;
    };

    interface NavItem {
        label: string;
        path: string;
        icon: React.ComponentType<any>;
        active: boolean;
    }
    const navItems: NavItem[] = [];

    // Home Link
    navItems.push({
        label: 'Home',
        path: '/',
        icon: Home,
        active: location.pathname === '/'
    });

    if (isAdmin) {
        navItems.push({
            label: 'Admin',
            path: '/admin',
            icon: LayoutDashboard,
            active: location.pathname.startsWith('/admin')
        });
    }

    if (isStaff) {
        navItems.push({
            label: 'Staff',
            path: '/staff',
            icon: ShieldCheck,
            active: location.pathname.startsWith('/staff') || location.pathname.startsWith('/room') || location.pathname.startsWith('/security')
        });
    }

    navItems.push({
        label: 'Community',
        path: '/social',
        icon: Users,
        active: location.pathname.startsWith('/social')
    });

    navItems.push({
        label: 'Student',
        path: '/student',
        icon: GraduationCap,
        active: location.pathname === '/student'
    });

    const handleLogout = async () => {
        setIsMenuOpen(false);
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error("Logout error:", error);
            navigate('/');
        }
    };

    return (
        <div className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between pointer-events-none transition-all duration-300 ${isScrolled ? 'p-2 md:p-3' : 'p-4'}`}>
            {/* Left Logo Section */}
            <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/')}
                className={`flex items-center gap-3 group pointer-events-auto cursor-pointer bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl transition-all hover:border-white/20 hover:bg-black/50 ${isScrolled ? 'p-1 pr-3 pl-1' : 'p-1.5 pr-4'}`}
            >
                <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-500" />
                    <div className={`relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center group-hover:border-primary/50 transition-all duration-300 ${isScrolled ? 'w-7 h-7' : 'w-8 h-8'}`}>
                        <Dna className={`text-primary animate-in zoom-in-50 duration-500 transition-all duration-300 ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'} group-hover:rotate-180`} />
                    </div>
                </div>
                <div className="flex flex-col leading-none">
                    <BrandName className={`font-black leading-none transition-all duration-300 ${isScrolled ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`} variant="navbar" />
                    <span className="hidden lg:block text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40 mt-0.5 pl-1">Liceo Agnesi</span>
                </div>

                {maintenanceMode && (
                    <div className="hidden lg:flex bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg items-center gap-1">
                        <Lock className="w-3 h-3 text-red-400 animate-pulse" />
                        <span className="text-[9px] font-medium tracking-wide text-red-400">Lockdown</span>
                    </div>
                )}
                {!isOnline && (
                    <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[9px] font-medium tracking-wide text-amber-500">Offline</span>
                    </div>
                )}
            </motion.div>

            {/* Center Navigation */}
            <nav 
                className={`hidden md:flex bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl items-center gap-1 shadow-2xl pointer-events-auto relative glass-card ${isScrolled ? 'p-1' : 'p-1.5'}`}
            >
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`relative z-10 flex items-center gap-2 rounded-xl text-xs font-semibold tracking-wide transition-colors duration-200 btn-press cursor-pointer ${isScrolled ? 'px-3 py-1.5' : 'px-4 py-2'} ${item.active
                            ? 'text-black font-bold'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {item.active && (
                            <motion.div
                                layoutId="desktop-nav-pill"
                                className="absolute inset-0 bg-brand-lime rounded-xl -z-10 shadow-[0_0_20px_rgba(226,243,60,0.35)]"
                                transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
                            />
                        )}
                        <item.icon className={`w-3.5 h-3.5 ${item.active ? 'stroke-[2.5]' : ''}`} />
                        <span className="hidden sm:inline">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Right Profile Info & Dropdown */}
            <div className="relative pointer-events-auto flex items-center gap-3 justify-end ml-auto lg:ml-0 lg:w-48" ref={menuRef}>
                {/* Mobile/Compact Lockdown Icon */}
                {maintenanceMode && (
                    <div className="lg:hidden bg-red-500 p-1.5 rounded-lg shadow-lg shadow-red-500/20 animate-bounce">
                        <Construction className="w-3.5 h-3.5 text-white" />
                    </div>
                )}
                
                {userProfile ? (
                    <>
                        {/* Streak Pill */}
                        <div className="relative" ref={streakMenuRef}>
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsStreakMenuOpen(!isStreakMenuOpen);
                                    setIsMenuOpen(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-2xl border rounded-2xl shadow-2xl transition-all cursor-pointer ${
                                    isStreakMenuOpen 
                                        ? 'border-orange-500/50 bg-black/60 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                                        : 'border-white/10 hover:border-orange-500/20 bg-black/40'
                                }`}
                            >
                                <Flame 
                                    className={`w-4 h-4 text-orange-500 transition-all ${
                                        !hasCheckedInToday 
                                            ? 'animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] fill-orange-500/40' 
                                            : 'fill-orange-500'
                                    }`} 
                                />
                                <span className={`text-xs font-semibold font-mono ${
                                    !hasCheckedInToday ? 'text-orange-400' : 'text-white'
                                }`}>
                                    {userProfile.streak || 0}
                                </span>
                            </motion.button>

                            {/* Streak Dropdown Popover */}
                            <AnimatePresence>
                            {isStreakMenuOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                    className="absolute top-full right-0 mt-2 w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] glass-card origin-top-right z-[110]"
                                >
                                    <div className="space-y-4 text-left">
                                        {/* Header */}
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                            <div className="flex items-center gap-2">
                                                <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                                                <span className="text-sm font-semibold text-white">
                                                    Serie di {userProfile.streak || 0} {userProfile.streak === 1 ? 'giorno' : 'giorni'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-medium text-white/40">Check-in</span>
                                        </div>

                                        {/* Calendar row */}
                                        <div className="flex justify-between gap-1 py-1">
                                            {getWeekDays().map((date, idx) => {
                                                const checked = isDateCheckedIn(date);
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                const dayName = ['D', 'L', 'M', 'M', 'G', 'V', 'S'][date.getDay()];
                                                return (
                                                    <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                                                        <span className={`text-[10px] font-semibold ${isToday ? 'text-orange-400' : 'text-white/30'}`}>
                                                            {dayName}
                                                        </span>
                                                        <motion.div 
                                                            whileHover={{ scale: 1.05 }}
                                                            className={`w-7 h-7 rounded-[9px] flex items-center justify-center border transition-all ${
                                                                checked 
                                                                    ? 'bg-gradient-to-br from-orange-400 to-amber-500 border-transparent shadow-[0_0_10px_rgba(249,115,22,0.3)] text-white font-mono font-semibold text-xs' 
                                                                    : isToday && !hasCheckedInToday
                                                                        ? 'border-orange-500/50 border-dashed animate-pulse text-orange-400' 
                                                                        : 'bg-white/5 border-white/10 text-white/20 font-mono text-[10px] font-medium'
                                                            }`}
                                                        >
                                                            {checked ? (
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[3]" />
                                                            ) : isToday && !hasCheckedInToday ? (
                                                                <Flame className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <span>{date.getDate()}</span>
                                                            )}
                                                        </motion.div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* XP Progress */}
                                        {(() => {
                                            const level = userProfile.xp ? calculateLevel(userProfile.xp) : 1;
                                            const { current, needed, percent } = xpProgress(userProfile.xp || 0);
                                            const levelColor = getLevelColor(level);
                                            return (
                                                <div className="space-y-1.5 border-t border-white/5 pt-3">
                                                    <div className="flex justify-between items-center text-[10px] font-medium font-mono text-white/40">
                                                        <span>Livello {level}</span>
                                                        <span>{current}/{needed} XP</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                                                        <motion.div 
                                                            className={`h-full rounded-full bg-gradient-to-r ${levelColor}`}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percent}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Action Button */}
                                        <div className="pt-2">
                                            {claimSuccess ? (
                                                <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide animate-in zoom-in-95 duration-200">
                                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                                                    Check-in completato! +{calculateStreakXP(userProfile?.streak || 1)} XP
                                                </div>
                                            ) : hasCheckedInToday ? (
                                                <div className="w-full py-3 bg-white/5 border border-white/10 text-white/40 rounded-xl text-center text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                    Riscattato Oggi
                                                </div>
                                            ) : (
                                                <motion.button
                                                    whileHover={{ scale: 1.02, backgroundColor: '#ea580c' }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleDailyCheckIn}
                                                    disabled={isClaiming}
                                                    className="w-full h-10 bg-orange-500 text-white rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_4px_20px_rgba(249,115,22,0.3)] cursor-pointer"
                                                >
                                                    {isClaiming ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Flame className="w-3.5 h-3.5 fill-white" />
                                                            Riscatta Streak
                                                        </>
                                                    )}
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                setIsMenuOpen(!isMenuOpen);
                                setIsStreakMenuOpen(false);
                            }}
                            className={`flex items-center gap-3 backdrop-blur-2xl border rounded-2xl shadow-2xl transition-all cursor-pointer ${isMenuOpen ? 'border-brand-lime/50 bg-black/60 shadow-[0_0_15px_rgba(226,243,60,0.15)]' : 'border-white/10 hover:border-white/20 bg-black/40'} ${isScrolled ? 'p-1 pl-3' : 'p-1.5 pl-4'}`}
                        >
                            <div className="hidden md:flex flex-col items-end">
                                <motion.div 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isAdmin) return;
                                        
                                        const now = Date.now();
                                        if (now - lastClickTime > 1000) {
                                            setClickCount(1);
                                        } else {
                                            const newCount = clickCount + 1;
                                            if (newCount >= 7) {
                                                onSecretTrigger?.();
                                                setClickCount(0);
                                            } else {
                                                setClickCount(newCount);
                                            }
                                        }
                                        setLastClickTime(now);
                                    }}
                                    animate={{
                                        scale: clickCount > 0 ? 1 + clickCount * 0.08 : 1,
                                        textShadow: clickCount > 0 ? `0 0 ${clickCount * 4}px rgba(226, 243, 60, 0.8)` : 'none',
                                        color: clickCount > 0 ? '#E2F33C' : '#0082e6'
                                    }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                    className="text-[10px] font-semibold tracking-wider leading-none mb-1 hover:brightness-125 transition-all origin-right cursor-pointer select-none"
                                >
                                    {userProfile ? formatRole(userProfile.role) : 'Ospite'}
                                </motion.div>
                                <span className="text-xs font-semibold text-white/70 truncate max-w-[120px] flex items-center gap-2">
                                    {userProfile.displayName || user?.email?.split('@')[0]}
                                    <UserRoleBadge role={userProfile.role} />
                                </span>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group transition-all duration-300 hover:border-white/30 hover:bg-white/10">
                                <Users className="w-4 h-4 text-white/20 group-hover:opacity-0 transition-opacity" />
                                <ChevronDown className={`w-4 h-4 text-white absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-all duration-300 ${isMenuOpen ? 'rotate-180 opacity-100' : ''}`} />
                                {pendingRequestsCount > 0 && (
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                                )}
                            </div>
                        </motion.button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                className="absolute top-full right-0 mt-2 w-64 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] glass-card origin-top-right z-[110]"
                            >
                                <div className="px-3 py-2 mb-2 border-b border-white/5">
                                    <p className="text-[10px] font-semibold text-white/40 tracking-wide mb-1">Account Connesso</p>
                                    <p className="text-xs font-semibold text-white/95 truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => { setIsMenuOpen(false); navigate(`/profile/${userProfile.username}`); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-primary transition-all text-xs font-semibold tracking-wide group relative cursor-pointer"
                                >
                                    <User className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                                    <span>Mio Profilo</span>
                                    {pendingRequestsCount > 0 && (
                                        <span className="ml-auto bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                            <Bell className="w-2.5 h-2.5" />
                                            {pendingRequestsCount} Nuove
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setIsMenuOpen(false); navigate('/settings'); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all text-xs font-semibold tracking-wide group cursor-pointer"
                                >
                                    <Settings className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                                    <span>Impostazioni Account</span>
                                </button>
                                <div className="my-1 border-b border-white/5" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-white/60 hover:text-red-400 transition-all text-xs font-semibold tracking-wide group cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4 text-white/20 group-hover:text-red-400 group-hover:-translate-x-0.5 transition-all" />
                                    <span>Esci dall'account</span>
                                </button>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-brand-lime text-black text-xs font-semibold tracking-wide shadow-[0_0_20px_rgba(226,243,60,0.25)] hover:shadow-[0_0_30px_rgba(226,243,60,0.45)] transition-all pointer-events-auto cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5 rotate-180" />
                        Accedi
                    </motion.button>
                )}
            </div>

            {/* Ephemeral Check-In Success Visual Popup */}            <AnimatePresence>
            {claimSuccess && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setClaimSuccess(false)}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto cursor-pointer"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                        onClick={(e) => e.stopPropagation()} 
                        className="relative bg-black/60 backdrop-blur-3xl border border-white/15 p-8 rounded-[2.5rem] max-w-sm w-full text-center shadow-[0_0_50px_rgba(249,115,22,0.15)] glass-card cursor-default overflow-hidden"
                    >
                        {/* Glowing orange/red background glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-br from-orange-600/20 to-amber-500/20 blur-3xl pointer-events-none" />
                        
                        <div className="space-y-6 relative z-10">
                            {/* Pulsing Flame icon in rotated squircle */}
                            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-amber-500/30 blur-2xl rounded-full scale-125 animate-pulse" />
                                <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-center rotate-6 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                                    <Flame className="w-10 h-10 text-orange-500 fill-orange-500 animate-bounce" />
                                </div>
                            </div>

                            {/* Congratulatory message */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold tracking-[0.2em] text-orange-400 uppercase">Daily Check-In</span>
                                <h3 className="text-2xl font-black font-display text-white leading-tight italic uppercase tracking-tight">
                                    Giorno {userProfile?.streak || 1} <span className="text-orange-500">Confermato</span>
                                </h3>
                                <p className="text-[11px] text-white/40 font-medium">Continua così per mantenere attiva la tua serie!</p>
                            </div>

                            {/* Stats Bento Box */}
                            <div className="py-3 px-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between text-left shadow-inner">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <Sparkles className="w-4 h-4 animate-pulse" />
                                    </div>
                                    <span className="text-xs font-semibold text-white/70">XP Guadagnati</span>
                                </div>
                                <span className="text-sm font-black font-mono text-emerald-400 tabular-nums">
                                    +{calculateStreakXP(userProfile?.streak || 1)} XP
                                </span>
                            </div>

                            {/* Level Progress */}
                            {(() => {
                                const level = userProfile?.xp ? calculateLevel(userProfile.xp) : 1;
                                const { current, needed, percent } = xpProgress(userProfile?.xp || 0);
                                const levelColor = getLevelColor(level);
                                return (
                                    <div className="space-y-2 text-left border-t border-white/5 pt-4">
                                        <div className="flex justify-between items-center text-[10px] font-bold font-mono text-white/30 uppercase tracking-widest">
                                            <span>Livello {level}</span>
                                            <span className="tabular-nums">{current}/{needed} XP</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                                            <motion.div 
                                                className={`h-full rounded-full bg-gradient-to-r ${levelColor}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percent}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Main Confirm Button */}
                            <div className="pt-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setClaimSuccess(false)}
                                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] shadow-lg shadow-orange-500/10 cursor-pointer"
                                >
                                    Fantastico!
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Ephemeral Badge Unlock Success Visual Popup */}
            <AnimatePresence>
            {unlockedBadge && (() => {
                const r = RARITY_CONFIG[unlockedBadge.rarity] || RARITY_CONFIG.COMMON;
                const IconComponent = ICON_MAP[unlockedBadge.iconName] || Award;
                return (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setUnlockedBadge(null)}
                        className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto cursor-pointer"
                    >
                        <motion.div 
                            initial={{ scale: 0.85, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.85, y: 30 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                            onClick={(e) => e.stopPropagation()} 
                            className={`relative bg-black/60 backdrop-blur-3xl border p-8 rounded-[2.5rem] max-w-sm w-full text-center shadow-[0_25px_60px_rgba(0,0,0,0.8)] glass-card cursor-default border-white/10 ${r.borderGlow}`}
                        >
                            {/* Glowing backdrop glow */}
                            <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] blur-3xl pointer-events-none" />
                            
                            {/* Close Button */}
                            <button 
                                onClick={() => setUnlockedBadge(null)}
                                className="absolute top-4 right-5 text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors cursor-pointer"
                            >
                                Chiudi
                            </button>

                            <div className="space-y-6">
                                {/* Celebratory header */}
                                <div className="space-y-1">
                                    <span className="text-[10px] font-semibold tracking-[0.15em] text-primary">NUOVO BADGE SBLOCCATO</span>
                                    <h3 className="text-xl font-bold text-white leading-tight">Congratulazioni 🎉</h3>
                                </div>

                                {/* Glowing Badge Icon */}
                                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                                    {/* Pulse background matching rarity */}
                                    <div className={`absolute inset-0 rounded-full blur-xl scale-125 animate-pulse ${r.glowClass || 'bg-white/5'}`} />
                                    <div className={`relative w-20 h-20 border rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 bg-white/[0.02] border-white/10 ${r.cardClass}`}>
                                        {unlockedBadge.emoji ? (
                                            <span className="text-4xl drop-shadow-2xl animate-bounce">{unlockedBadge.emoji}</span>
                                        ) : (
                                            <IconComponent className={`w-10 h-10 animate-pulse ${r.iconClass}`} />
                                        )}
                                    </div>
                                </div>

                                {/* Badge details */}
                                <div className="space-y-2">
                                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-semibold tracking-wide border bg-white/5 ${r.cardClass}`}>
                                        {r.label}
                                    </span>
                                    <h4 className="text-base font-bold text-white tracking-wide">{unlockedBadge.name}</h4>
                                    <p className="text-xs text-white/50 px-4 leading-relaxed font-medium">
                                        {unlockedBadge.description}
                                    </p>
                                </div>

                                {/* Success message */}
                                <div className="py-3 px-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                    <span className="text-[10px] font-semibold text-primary">Aggiunto alla tua bacheca</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                );
            })()}
            </AnimatePresence>
        </div>
    );
};
