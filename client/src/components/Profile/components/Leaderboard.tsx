import React, { useState, useEffect } from 'react';
import { collection, query, limit, orderBy, getDocs, where, getDoc, doc } from 'firebase/firestore';
import { UserRoleBadge } from '../../Common/UserRoleBadge';
import { db } from '../../../firebase';
import type { UserProfile } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Crown,
    Medal, 
    Info, 
    X, 
    ChevronUp, 
    Trophy,
    Users,
    BookOpen,
    Flame,
    Sparkles
} from 'lucide-react';


interface LeaderboardEntry {
    uid: string;
    displayName: string;
    username: string;
    role: string;
    xp: number;
    level: number;
    streak?: number;
    className?: string;
}

type TabType = 'GLOBAL' | 'FRIENDS' | 'CLASS';

const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

export const Leaderboard: React.FC = () => {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<TabType>('GLOBAL');
    const [globalEntries, setGlobalEntries] = useState<LeaderboardEntry[]>([]);
    const [friendsEntries, setFriendsEntries] = useState<LeaderboardEntry[]>([]);
    const [classEntries, setClassEntries] = useState<LeaderboardEntry[]>([]);
    
    const [loadingGlobal, setLoadingGlobal] = useState(true);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [loadingClass, setLoadingClass] = useState(false);
    
    // Top 200 list for global ranking position tracking
    const [allGlobalResults, setAllGlobalResults] = useState<LeaderboardEntry[]>([]);
    const [myRankInfo, setMyRankInfo] = useState<{ rank: number; entry: LeaderboardEntry } | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [lastFriendsString, setLastFriendsString] = useState('');

    const mapToEntry = (id: string, data: any): LeaderboardEntry => ({
        uid: id,
        displayName: data.displayName || 'Utente eversia',
        username: data.username || `@user_${id.slice(0, 4)}`,
        role: data.role || 'STUDENT',
        xp: data.xp || 0,
        level: data.level || 1,
        streak: data.streak || 0,
        className: data.className || '',
    });

    // 1. Fetch Top 200 users globally (updates the GLOBAL tab and calculates absolute rank)
    useEffect(() => {
        let isMounted = true;
        setLoadingGlobal(true);
        const q = query(
            collection(db, 'users'),
            orderBy('xp', 'desc'),
            limit(200)
        );

        getDocs(q).then((snap) => {
            if (!isMounted) return;
            const results: LeaderboardEntry[] = [];
            snap.forEach(doc => {
                const data = doc.data() as UserProfile;
                results.push(mapToEntry(doc.id, data));
            });

            results.sort((a, b) => b.xp - a.xp);
            
            setAllGlobalResults(results);
            setGlobalEntries(results.slice(0, 25)); // Top 25

            if (userProfile) {
                const idx = results.findIndex(e => e.uid === userProfile.uid);
                if (idx >= 0) {
                    setMyRankInfo({ rank: idx + 1, entry: results[idx] });
                } else {
                    setMyRankInfo(null);
                }
            }
            setLoadingGlobal(false);
        }).catch((err) => {
            console.warn("[Leaderboard] Global query error:", err);
            if (isMounted) setLoadingGlobal(false);
        });

        return () => {
            isMounted = false;
        };
    }, [userProfile?.uid]);

    // 2. Fetch Friends logic (called when switching to FRIENDS or when profile updates)
    const fetchFriendsRanking = async () => {
        if (!userProfile) return;
        setLoadingFriends(true);
        try {
            const results: LeaderboardEntry[] = [];
            // Include self
            results.push(mapToEntry(userProfile.uid, userProfile));

            const friendUids = userProfile.friends || [];
            if (friendUids.length > 0) {
                await Promise.all(friendUids.map(async (uid) => {
                    try {
                        const snap = await getDoc(doc(db, 'users', uid));
                        if (snap.exists()) {
                            results.push(mapToEntry(snap.id, snap.data() as UserProfile));
                        }
                    } catch (err) {
                        console.warn(`[Leaderboard] Error fetching friend ${uid}:`, err);
                    }
                }));
            }
            results.sort((a, b) => b.xp - a.xp);
            setFriendsEntries(results);
        } catch (err) {
            console.error("[Leaderboard] Friends ranking error:", err);
        } finally {
            setLoadingFriends(false);
        }
    };

    // 3. Fetch Class ranking
    useEffect(() => {
        if (!userProfile?.className || activeTab !== 'CLASS') {
            setClassEntries([]);
            return;
        }

        let isMounted = true;
        setLoadingClass(true);
        const q = query(
            collection(db, 'users'),
            where('className', '==', userProfile.className)
        );

        getDocs(q).then((snap) => {
            if (!isMounted) return;
            const results: LeaderboardEntry[] = [];
            snap.forEach(doc => {
                results.push(mapToEntry(doc.id, doc.data()));
            });
            // Sort by XP in-memory to bypass composite index requirement
            results.sort((a, b) => b.xp - a.xp);
            setClassEntries(results);
            setLoadingClass(false);
        }).catch((err) => {
            console.warn("[Leaderboard] Class query error:", err);
            if (isMounted) setLoadingClass(false);
        });

        return () => {
            isMounted = false;
        };
    }, [userProfile?.className, activeTab]);

    // Trigger friends fetch when tab becomes active or profile updates
    useEffect(() => {
        if (activeTab === 'FRIENDS' && userProfile) {
            const friendsStr = (userProfile.friends || []).join(',');
            if (friendsEntries.length === 0 || friendsStr !== lastFriendsString) {
                setLastFriendsString(friendsStr);
                fetchFriendsRanking();
            }
        }
    }, [activeTab, userProfile?.friends, friendsEntries.length, lastFriendsString]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-4 h-4 text-amber-400" />;
        if (rank === 2) return <Medal className="w-4 h-4 text-slate-300" />;
        if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
        return <span className="text-[10px] font-black text-white/20 w-4 text-center tabular-nums">{rank}</span>;
    };

    const getActiveEntries = () => {
        if (activeTab === 'FRIENDS') return friendsEntries;
        if (activeTab === 'CLASS') return classEntries;
        return globalEntries;
    };

    const isCurrentTabLoading = () => {
        if (activeTab === 'FRIENDS') return loadingFriends;
        if (activeTab === 'CLASS') return loadingClass;
        return loadingGlobal;
    };

    const activeEntries = getActiveEntries();

    return (
        <div className="space-y-6">
            {/* Tab Selector Bar (Premium spring indicator) */}
            <div className="flex gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl overflow-x-auto scrollbar-hide max-w-full relative z-10">
                {[
                    { id: 'GLOBAL' as TabType, label: 'Liceo Agnesi', icon: Trophy },
                    { id: 'FRIENDS' as TabType, label: 'Amici', icon: Users },
                    { id: 'CLASS' as TabType, label: `Classe ${userProfile?.className || ''}`, icon: BookOpen },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const isDisabled = tab.id === 'CLASS' && !userProfile?.className;
                    
                    if (isDisabled) return null;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs font-semibold relative transition-all duration-300 btn-press overflow-hidden ${
                                isActive 
                                    ? 'text-black z-10' 
                                    : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="leaderboard-tab-indicator"
                                    className="absolute inset-0 bg-white rounded-xl sm:rounded-2xl -z-10"
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                            )}
                            <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : ''}`} />
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Main Leaderboard Card Wrapper */}
            <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden relative group">
                {/* Header */}
                <div className="px-5 py-5 sm:p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            {activeTab === 'GLOBAL' && <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
                            {activeTab === 'FRIENDS' && <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
                            {activeTab === 'CLASS' && <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-lg font-bold font-display tracking-tight text-white">
                                {activeTab === 'GLOBAL' && 'Campioni del Liceo'}
                                {activeTab === 'FRIENDS' && 'La Tua Cerchia'}
                                {activeTab === 'CLASS' && `Classifica della ${userProfile?.className}`}
                            </h3>
                            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider flex items-center gap-1 mt-1">
                                {activeTab === 'GLOBAL' && 'I migliori 25 per XP dell\'istituto'}
                                {activeTab === 'FRIENDS' && 'La classifica tra te e i tuoi amici'}
                                {activeTab === 'CLASS' && 'Chi accumula più XP tra i tuoi compagni'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowInfo(!showInfo)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all btn-press"
                    >
                        <Info className={`w-4 h-4 sm:w-5 h-5 ${showInfo ? 'text-primary' : 'text-white/20'}`} />
                    </button>
                </div>

                {/* Content Body */}
                {isCurrentTabLoading() ? (
                    /* Skeletons */
                    <div className="divide-y divide-white/[0.03]">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-3 px-4 py-4 animate-pulse">
                                <div className="w-6 h-4 bg-white/5 rounded" />
                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-white/5 rounded w-1/3" />
                                    <div className="h-2.5 bg-white/5 rounded w-1/4" />
                                </div>
                                <div className="h-4 bg-white/5 rounded w-10" />
                            </div>
                        ))}
                    </div>
                ) : activeEntries.length === 0 ? (
                    /* Empty States */
                    <div className="p-12 sm:p-20 text-center space-y-6">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/5">
                            {activeTab === 'FRIENDS' ? <Users className="w-8 h-8 text-white/10" /> : <BookOpen className="w-8 h-8 text-white/10" />}
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-white/40">
                                {activeTab === 'FRIENDS' ? 'Nessun amico trovato' : 'Nessun compagno registrato'}
                            </p>
                            <p className="text-[10px] text-white/20 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                                {activeTab === 'FRIENDS' 
                                    ? 'Aggiungi altri studenti del Liceo Agnesi per metterti alla prova e scalare la classifica insieme.' 
                                    : 'I tuoi compagni di classe non si sono ancora iscritti o non hanno completato il loro profilo.'}
                            </p>
                        </div>
                        {activeTab === 'FRIENDS' ? (
                            <button 
                                onClick={() => navigate('/social')}
                                className="px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all btn-press"
                            >
                                Trova Amici
                            </button>
                        ) : (
                            <button 
                                onClick={() => navigate('/settings')}
                                className="px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all btn-press"
                            >
                                Configura Profilo
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {/* List of all entries (Unified, Classic layout) */}
                        <div className="divide-y divide-white/[0.03]">
                            {activeEntries.map((entry, index) => {
                                const rank = index + 1;
                                const isMe = entry.uid === userProfile?.uid;

                                return (
                                    <button
                                        key={entry.uid}
                                        onClick={() => navigate(entry.username ? `/profile/${entry.username}` : `/profile/uid/${entry.uid}`)}
                                        className={`w-full flex items-center gap-2.5 sm:gap-4 px-3.5 sm:px-6 md:px-8 py-3.5 sm:py-5 text-left transition-all hover:bg-white/[0.03] relative overflow-hidden group/item ${
                                            isMe ? 'bg-primary/[0.04]' : ''
                                        } ${
                                            rank === 1 ? 'border-y border-amber-500/20 bg-amber-500/[0.02] shadow-[0_0_15px_rgba(245,158,11,0.03)]' :
                                            rank === 2 ? 'border-y border-slate-300/10 bg-slate-300/[0.01]' :
                                            rank === 3 ? 'border-y border-amber-700/10 bg-amber-700/[0.005]' : ''
                                        }`}
                                    >
                                        {/* Hover spotlight */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />

                                        {/* Rank */}
                                        <div className="w-6 flex-shrink-0 flex justify-center relative z-10">
                                            {getRankIcon(rank)}
                                        </div>

                                        {/* Avatar (Podium gradients or squircle initials) */}
                                        <div className="relative flex-shrink-0 z-10">
                                            <div 
                                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-500 group-hover/item:scale-105 ${
                                                    rank === 1 ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-black border border-amber-300/30 shadow-[0_0_15px_rgba(245,158,11,0.35)]' : 
                                                    rank === 2 ? 'bg-gradient-to-br from-slate-200 via-neutral-300 to-slate-400 text-black border border-slate-300/30 shadow-[0_0_10px_rgba(203,213,225,0.25)]' :
                                                    rank === 3 ? 'bg-gradient-to-br from-orange-400 via-amber-700 to-orange-850 text-white border border-amber-600/30 shadow-[0_0_8px_rgba(217,119,6,0.25)]' : 
                                                    'bg-white/5 border border-white/10 text-white/70'
                                                }`}
                                            >
                                                <span className="font-display font-bold text-xs sm:text-sm tracking-tight select-none">
                                                    {getInitials(entry.displayName)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Name & Subtitle */}
                                        <div className="flex-1 min-w-0 relative z-10">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-xs sm:text-sm font-display font-bold tracking-tight leading-tight whitespace-normal break-words ${
                                                    isMe ? 'text-primary' : 
                                                    rank === 1 ? 'text-amber-400 font-bold' : 'text-white/80 group-hover/item:text-white'
                                                }`}>
                                                    {entry.displayName}
                                                </span>
                                                <UserRoleBadge role={entry.role} />
                                                <span className="text-[7.5px] sm:text-[8px] font-semibold uppercase bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/40 flex items-center gap-1 shrink-0 tabular-nums">
                                                    Lvl {entry.level}
                                                    {entry.streak !== undefined && entry.streak > 0 && (
                                                        <span className="text-orange-400 font-bold animate-pulse flex items-center gap-0.5">
                                                            🔥 {entry.streak}
                                                        </span>
                                                    )}
                                                </span>
                                                {isMe && <span className="text-[7.5px] sm:text-[8px] bg-white text-black px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">Tu</span>}
                                            </div>
                                            <p className="text-[9px] text-white/20 font-bold truncate leading-none mt-1 sm:mt-1.5">{entry.username}</p>
                                        </div>

                                        {/* Score / XP (Stable alignment) */}
                                        <div className="text-right flex-shrink-0 relative z-10 pl-3 border-l border-white/5">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-sm sm:text-base font-bold tabular-nums ${rank <= 3 ? 'text-brand-lime' : 'text-white/60'}`}>{entry.xp}</span>
                                                    <p className="text-[7.5px] sm:text-[8px] text-white/20 font-semibold uppercase tracking-wider">XP</p>
                                                </div>
                                                {activeTab === 'GLOBAL' && rank > 1 && !isMe && activeEntries[index - 1] && (
                                                    <div className="text-[8px] sm:text-[9px] text-primary/50 font-semibold tracking-tighter transition-colors group-hover/item:text-primary tabular-nums">
                                                        +{activeEntries[index - 1].xp - entry.xp + 1} ⬆
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* My Rank Sticky Bar (glass-card style with tabular-nums) */}
                {userProfile && activeTab === 'GLOBAL' && myRankInfo && myRankInfo.rank > 25 && (
                    <div className="bg-white/[0.02] border-t border-white/10 px-5 py-4 flex items-center justify-between backdrop-blur-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                                <span className="text-xs font-display font-bold tabular-nums">#{myRankInfo.rank}</span>
                            </div>
                            <div>
                                <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">La tua posizione</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <p className="text-xs font-bold text-white leading-none tabular-nums">{myRankInfo.entry.xp} XP</p>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <p className="text-[9px] text-white/30 leading-none tabular-nums">Livello {myRankInfo.entry.level}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right relative z-10 pl-3">
                            {allGlobalResults[myRankInfo.rank - 2] && (
                                <div className="flex flex-col items-end gap-0.5">
                                    <div className="flex items-center gap-1 text-brand-lime font-semibold text-[9px] leading-none uppercase tracking-wider tabular-nums">
                                        +{allGlobalResults[myRankInfo.rank - 2].xp - myRankInfo.entry.xp + 1} per salire
                                        <ChevronUp className="w-3 h-3 animate-bounce" />
                                    </div>
                                    <p className="text-[8px] text-white/20 uppercase font-semibold tracking-wider">Sei a un passo!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                {!isCurrentTabLoading() && activeEntries.length > 0 && (
                    <div className="px-5 py-4 bg-black/20 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[8px] sm:text-[9px] text-white/20 font-semibold uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            {activeTab === 'GLOBAL' && `Visualizzati i Top 25 su ${allGlobalResults.length} iscritti`}
                            {activeTab === 'FRIENDS' && `Visualizzati ${activeEntries.length} amici`}
                            {activeTab === 'CLASS' && `Visualizzati ${activeEntries.length} compagni di classe`}
                        </div>
                    </div>
                )}
            </div>

            {/* Info Popup Modal (Spring animated portal) */}
            {createPortal(
                <AnimatePresence>
                    {showInfo && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
                                onClick={() => setShowInfo(false)} 
                            />
                            
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                className="relative w-full max-w-lg bg-[#09090b] border border-white/10 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] z-10"
                            >
                                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-start bg-gradient-to-b from-white/[0.02] to-transparent">
                                    <div>
                                        <h4 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight italic">Sistema di Punteggio</h4>
                                        <p className="text-[9px] text-brand-lime font-semibold uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
                                            <Trophy className="w-3 h-3" /> Guida eversia
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setShowInfo(false)} 
                                        className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 group btn-press"
                                    >
                                        <X className="w-5 h-5 text-white/40 group-hover:text-white" />
                                    </button>
                                </div>

                                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 sm:space-y-8 soft-scroll-fade">
                                    <div className="p-4 sm:p-5 bg-white/[0.01] border border-white/5 rounded-2xl sm:rounded-3xl">
                                        <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
                                            Il tuo posizionamento in classifica dipende unicamente dai punti XP totali accumulati. 
                                            Ci sono diversi modi per guadagnare XP partecipando alla vita scolastica ed Eversia:
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        {[
                                            { name: "Presenza Assemblea", value: "+250 XP", desc: "Per singolo turno (+250 XP bonus presenza completa)" },
                                            { name: "Check-in Giornaliero", value: "+1 XP", desc: "Accesso giornaliero (+ bonus streak di giorni consecutivi)" },
                                            { name: "Servizio Staff", value: "+1000/1200 XP", desc: "Collabora come Security o Room Manager alle assemblee" },
                                            { name: "Sblocco Badge", value: "Fino a +1500 XP", desc: "Raggiungi gli obiettivi e sblocca badge leggendari" }
                                        ].map((source) => (
                                            <div 
                                                key={source.name} 
                                                className="p-4 sm:p-5 rounded-2xl border bg-white/[0.01] border-white/5 flex flex-col justify-between gap-1 sm:gap-2 transition-all hover:bg-white/[0.03] hover:border-white/10"
                                            >
                                                <div>
                                                    <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-brand-lime block mb-0.5">{source.name}</span>
                                                    <p className="text-[9px] sm:text-[10px] text-white/40 leading-tight font-medium">{source.desc}</p>
                                                </div>
                                                <span className="text-base sm:text-lg font-display font-bold text-white mt-2 tabular-nums">{source.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-5 sm:p-6 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <Flame className="w-12 h-12 text-primary" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-4 h-4 text-orange-400" />
                                            <h5 className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-white">Consiglio dello Staff</h5>
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-white/40 leading-relaxed font-medium">
                                            Partecipare alle assemblee o far parte dello staff di Eversia garantisce le quantità più elevate di XP in assoluto. 
                                            Inoltre, mantenere la streak giornaliera attiva fa crescere i tuoi punti XP progressivamente.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-8 bg-white/[0.01] border-t border-white/5">
                                    <button 
                                        onClick={() => setShowInfo(false)}
                                        className="w-full py-4 bg-white text-black hover:bg-neutral-100 rounded-xl text-xs font-semibold tracking-wide transition-all btn-press shadow-lg"
                                    >
                                        Ho Capito
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
