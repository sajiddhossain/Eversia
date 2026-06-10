import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db, functions } from '../../../firebase';
import { httpsCallable } from 'firebase/functions';
import type { UserProfile } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { Search, Loader2, User, CheckCircle2, X, Users, ShieldAlert, UserPlus, Clock, Sparkles } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { UserRoleBadge } from '../../Common/UserRoleBadge';
import { motion } from 'framer-motion';

const isPermissionError = (err: any) =>
    (err?.code || '').includes('permission') ||
    (err?.message || '').toLowerCase().includes('permission') ||
    (err?.message || '').toLowerCase().includes('insufficient');

export const UserDiscovery: React.FC = () => {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<(UserProfile & { mutualFriends: number })[]>([]);
    const [loading, setLoading] = useState(false);
    const [sendingReqTo, setSendingReqTo] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(false);

    const [suggestions, setSuggestions] = useState<(UserProfile & { mutualFriends: number })[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    const [pendingReqsMap, setPendingReqsMap] = useState<Record<string, { id: string, type: 'SENT' | 'RECEIVED' }>>({});

    // Filter suggestions in real-time on the client to exclude active pending requests/friends
    const visibleSuggestions = useMemo(() => {
        return suggestions
            .filter(u => !pendingReqsMap[u.uid] && !(userProfile?.friends || []).includes(u.uid))
            .slice(0, 6);
    }, [suggestions, pendingReqsMap, userProfile?.friends]);

    // Fetch Suggestions from Cloud Function
    useEffect(() => {
        if (!userProfile) return;

        const fetchSuggestions = async () => {
            setSuggestionsLoading(true);
            try {
                const getFriendSuggestionsFn = httpsCallable(functions, 'getFriendSuggestions');
                const res = await getFriendSuggestionsFn();
                const data = res.data as (UserProfile & { mutualFriends: number })[];
                setSuggestions(data);
            } catch (err) {
                if (!isPermissionError(err)) console.error('[UserDiscovery] Error fetching suggestions:', err);
            } finally {
                setSuggestionsLoading(false);
            }
        };

        fetchSuggestions();
    }, [userProfile?.uid, userProfile?.className, userProfile?.friends?.join(',')]);

    // Listener real-time per le richieste pendenti (per filtrare e sincronizzare i tasti)
    useEffect(() => {
        if (!userProfile) return;

        const sentQ = query(collection(db, 'friendRequests'), where('from', '==', userProfile.uid), where('status', '==', 'PENDING'));
        const receivedQ = query(collection(db, 'friendRequests'), where('to', '==', userProfile.uid), where('status', '==', 'PENDING'));

        let sentData: Record<string, { id: string, type: 'SENT' }> = {};
        let receivedData: Record<string, { id: string, type: 'RECEIVED' }> = {};

        const updateAll = () => {
            setPendingReqsMap({ ...sentData, ...receivedData });
        };

        const unsubSent = onSnapshot(sentQ, (snap) => {
            sentData = {};
            snap.docs.forEach(d => {
                sentData[d.data().to] = { id: d.id, type: 'SENT' };
            });
            updateAll();
        }, (err) => {
            if (!isPermissionError(err)) console.warn('[UserDiscovery] Sent requests listener error:', err);
        });

        const unsubReceived = onSnapshot(receivedQ, (snap) => {
            receivedData = {};
            snap.docs.forEach(d => {
                receivedData[d.data().from] = { id: d.id, type: 'RECEIVED' };
            });
            updateAll();
        }, (err) => {
            if (!isPermissionError(err)) console.warn('[UserDiscovery] Received requests listener error:', err);
        });

        return () => {
            unsubSent();
            unsubReceived();
        };
    }, [userProfile?.uid]);

    // Debounced search
    useEffect(() => {
        const activeRef = { current: true };
        const timer = setTimeout(() => {
            if (searchTerm.trim().length >= 3) {
                handleSearch(searchTerm, activeRef);
            } else {
                setResults([]);
            }
        }, 500);

        return () => {
            activeRef.current = false;
            clearTimeout(timer);
        };
    }, [searchTerm]);

    const handleSearch = async (term: string, activeRef: { current: boolean }) => {
        setLoading(true);
        try {
            const searchUsersFn = httpsCallable(functions, 'searchUsers');
            const res = await searchUsersFn({ queryText: term });
            if (!activeRef.current) return;

            const users = res.data as any[];

            // Calculate mutual friends
            const myFriendsSet = new Set(userProfile?.friends || []);
            const processedResults = users.map(user => {
                const userFriends = user.friends || [];
                const mutuals = userFriends.filter((f: string) => myFriendsSet.has(f)).length;
                return { ...user, mutualFriends: mutuals };
            });

            setResults(processedResults.sort((a, b) => b.mutualFriends - a.mutualFriends));
        } catch (err) {
            if (!isPermissionError(err)) console.error('[UserDiscovery] Error searching:', err);
        } finally {
            if (activeRef.current) setLoading(false);
        }
    };

    const sendFriendRequest = async (toUid: string) => {
        if (!userProfile) return;

        // Throttle lato client (UX guard)
        const lastRequest = sessionStorage.getItem(`last_fr_time_${userProfile.uid}`);
        const now = Date.now();
        if (lastRequest && now - parseInt(lastRequest) < 2000) {
            setCooldown(true);
            setTimeout(() => setCooldown(false), 3000);
            return;
        }
        sessionStorage.setItem(`last_fr_time_${userProfile.uid}`, now.toString());

        setSendingReqTo(toUid);
        try {
            const sendFriendRequestFn = httpsCallable(functions, 'sendFriendRequest');
            await sendFriendRequestFn({ toUid });
        } catch (err) {
            console.error('[UserDiscovery] Error sending request:', err);
        } finally {
            setSendingReqTo(null);
        }
    };

    const cancelFriendRequest = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'friendRequests', requestId));
        } catch (err) {
            if (!isPermissionError(err)) console.error('[UserDiscovery] Error canceling request:', err);
        }
    };

    const acceptFriendRequest = async (requestId: string, fromUid: string) => {
        if (!userProfile) return;
        try {
            const acceptFriendRequestFn = httpsCallable(functions, 'acceptFriendRequest');
            await acceptFriendRequestFn({ requestId, fromUid });
        } catch (err) {
            if (!isPermissionError(err)) console.error('[UserDiscovery] Error accepting request:', err);
        }
    };

    const renderUserCard = (user: UserProfile & { mutualFriends: number }) => {
        const isFriend = (userProfile?.friends || []).includes(user.uid);
        const pending = pendingReqsMap[user.uid];

        return (
            <div
                key={user.uid}
                className="bg-white/[0.015] border border-white/5 rounded-2xl p-3 flex flex-row items-center justify-between gap-3 min-h-[72px] group hover:bg-white/[0.03] hover:border-white/10 hover:shadow-lg transition-all duration-300 glass-card"
            >
                <button
                    onClick={() => {
                        if (user.username) {
                            navigate(`/profile/${user.username}`);
                        } else {
                            navigate(`/profile/uid/${user.uid}`);
                        }
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                >
                    {/* Fixed aspect-square initials avatar to prevent layout shift */}
                    <div className="w-10 h-10 aspect-square rounded-xl bg-gradient-to-br from-primary/10 to-brand-lime/10 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 group-hover:border-primary/30">
                        <span className="text-sm font-bold text-primary font-display">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4 text-white/20" />}
                        </span>
                    </div>
                    
                    {/* Info with progressive font scaling & fallback truncation */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs sm:text-sm font-semibold text-white leading-tight truncate">
                                {user.displayName}
                            </p>
                            <UserRoleBadge role={user.role} />
                            {user.className && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                                    {user.className}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 min-w-0">
                            {user.username ? (
                                <p className="text-[10px] text-primary/60 font-medium font-mono truncate">
                                    {user.username.startsWith('@') ? user.username : `@${user.username}`}
                                </p>
                            ) : (
                                <p className="text-[10px] text-white/20 font-medium italic truncate">nessun username</p>
                            )}
                            {user.mutualFriends > 0 && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="text-[10px] font-medium text-white/40 font-mono">
                                        {user.mutualFriends} {user.mutualFriends === 1 ? 'comune' : 'comuni'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </button>

                {/* Rigid action container with flex-shrink-0 (w-9 h-9) */}
                <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
                    {isFriend ? (
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 opacity-60 flex-shrink-0" title="Amico">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    ) : pending?.type === 'SENT' ? (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => cancelFriendRequest(pending.id)}
                            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 flex items-center justify-center transition-colors text-white/40 flex-shrink-0 cursor-pointer"
                            title="Annulla Richiesta"
                        >
                            <Clock className="w-4 h-4" />
                        </motion.button>
                    ) : pending?.type === 'RECEIVED' ? (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => acceptFriendRequest(pending.id, user.uid)}
                            className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                            title="Accetta Richiesta"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => sendFriendRequest(user.uid)}
                            disabled={sendingReqTo === user.uid}
                            className="w-9 h-9 rounded-xl bg-primary text-black flex items-center justify-center transition-colors hover:shadow-lg hover:shadow-primary/20 flex-shrink-0 cursor-pointer"
                            title="Aggiungi Amico"
                        >
                            {sendingReqTo === user.uid ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <UserPlus className="w-4 h-4" />
                            )}
                        </motion.button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="relative group">
                <div className="relative">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${loading ? 'text-primary animate-pulse' : 'text-white/30'}`} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cerca per nome, username o email..."
                        className="w-full bg-white/[0.01] border border-white/15 focus:border-primary/40 focus:bg-white/[0.02] rounded-2xl py-3.5 pl-12 pr-10 text-sm text-white placeholder:text-white/20 outline-none transition-all shadow-xl glass-card font-medium"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => { setSearchTerm(''); setResults([]); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5 text-white/20" />
                        </button>
                    )}
                </div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 via-blue-500/5 to-transparent blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity -z-10" />
            </div>

            {cooldown && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    <p className="text-[10px] font-semibold tracking-wider text-red-400 uppercase">
                        Spam Shield: Hai raggiunto il limite giornaliero
                    </p>
                </div>
            )}

            {/* Results or Suggestions */}
            {searchTerm.trim().length >= 3 ? (
                // SEARCH RESULTS
                <div className="animate-in fade-in duration-500 space-y-4">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-[72px] bg-white/[0.01] border border-white/5 rounded-2xl animate-pulse flex items-center px-4 gap-3 glass-card">
                                    <div className="w-10 h-10 aspect-square rounded-xl bg-white/10 animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse" />
                                        <div className="h-2.5 bg-white/10 rounded w-1/3 animate-pulse" />
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-white/10 animate-pulse flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {results.map(renderUserCard)}
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-25 space-y-4">
                            <Users className="w-12 h-12 mx-auto" />
                            <p className="text-xs font-semibold uppercase tracking-wider">Nessun match trovato</p>
                        </div>
                    )}
                </div>
            ) : (
                // SUGGESTIONS
                <div className="animate-in fade-in duration-500 space-y-6">
                    <div className="flex items-center gap-2.5 px-2">
                        <Sparkles className="w-4 h-4 text-brand-lime" />
                        <h3 className="text-xs font-semibold text-white/40 tracking-wider">Suggeriti per te</h3>
                    </div>

                    {suggestionsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-[72px] bg-white/[0.01] border border-white/5 rounded-2xl animate-pulse flex items-center px-4 gap-3 glass-card">
                                    <div className="w-10 h-10 aspect-square rounded-xl bg-white/10 animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse" />
                                        <div className="h-2.5 bg-white/10 rounded w-1/3 animate-pulse" />
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-white/10 animate-pulse flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : visibleSuggestions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {visibleSuggestions.map(renderUserCard)}
                        </div>
                    ) : (
                        <div className="py-20 text-center space-y-6">
                            <div className="w-20 h-20 bg-primary/5 rounded-[2rem] border border-white/5 flex items-center justify-center mx-auto mb-4 backdrop-blur-xl glass-card">
                                <Search className="w-8 h-8 text-white/10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold tracking-wider text-white/40 font-display">Trova nuovi amici</h3>
                                <p className="text-[10px] font-semibold text-white/30 tracking-wider uppercase max-w-[240px] mx-auto">
                                    Cerca studenti tramite nome, username o email istituzionale
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
