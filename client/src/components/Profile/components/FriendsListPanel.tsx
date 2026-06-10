import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { UserProfile } from '../../../types';
import { User, Users, Loader2, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserRoleBadge } from '../../Common/UserRoleBadge';

// Massimo amici da caricare in una sola volta (anti-letture eccessive)
const MAX_FRIENDS_LOAD = 25;

const isPermissionError = (err: any) =>
    (err?.code || '').includes('permission') ||
    (err?.message || '').toLowerCase().includes('permission') ||
    (err?.message || '').toLowerCase().includes('insufficient');

interface FriendsListPanelProps {
    friendUids: string[];
    targetName?: string;
    isOwnProfile?: boolean;
    onItemClick?: () => void;
    onRemoveFriend?: (uid: string, name: string) => void;
}

export const FriendsListPanel: React.FC<FriendsListPanelProps> = ({ 
    friendUids, 
    targetName, 
    isOwnProfile = false, 
    onItemClick,
    onRemoveFriend
}) => {
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFriends = async () => {
            if (!friendUids || friendUids.length === 0) {
                setFriends([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const results: UserProfile[] = [];
                // Limitiamo a MAX_FRIENDS_LOAD per evitare N+1 esplosivi
                const uidsToLoad = friendUids.slice(0, MAX_FRIENDS_LOAD);
                await Promise.all(uidsToLoad.map(async (uid) => {
                    try {
                        const snap = await getDoc(doc(db, 'users', uid));
                        if (snap.exists()) results.push(snap.data() as UserProfile);
                    } catch (err) {
                        if (!isPermissionError(err)) console.warn('[FriendsListPanel] Error fetching friend:', uid, err);
                    }
                }));
                setFriends(results.sort((a, b) => (b.xp || 0) - (a.xp || 0)));
            } catch (err) {
                if (!isPermissionError(err)) console.error('[FriendsListPanel] Error fetching friends:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFriends();
    }, [friendUids]);

    if (loading) {
        return (
            <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    if (friendUids.length === 0) {
        return (
            <div className="bg-white/[0.01] border border-white/5 border-dashed rounded-[2rem] p-10 text-center space-y-4">
                <Users className="w-10 h-10 text-white/10 mx-auto" />
                {isOwnProfile ? (
                    <>
                        <div>
                            <p className="text-sm font-black text-white/40">La tua rete è vuota</p>
                            <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Non hai ancora aggiunto amici</p>
                        </div>
                        <button 
                            onClick={() => navigate('/social')}
                            className="mt-4 px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Trova nuovi amici
                        </button>
                    </>
                ) : (
                    <>
                        <div>
                            <p className="text-sm font-black text-white/40">{targetName || "Questo utente"} non ha amici</p>
                            <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">La sua rete è ancora vuota</p>
                        </div>
                        {targetName && (
                            <button 
                                onClick={() => navigate('/social')}
                                className="mt-4 px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Aggiungi {targetName} ai tuoi amici
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
                {friends.map((friend) => (
                    <div
                        key={friend.uid}
                        className="group flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.04] hover:border-white/10 transition-all"
                    >
                        <button
                            onClick={() => {
                                onItemClick?.();
                                if (friend.username) {
                                    navigate(`/profile/${friend.username}`);
                                } else {
                                    navigate(`/profile/uid/${friend.uid}`);
                                }
                            }}
                            className="flex items-center gap-4 text-left min-w-0 flex-1"
                        >
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
                                <User className="w-5 h-5 md:w-6 md:h-6 text-white/10 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-black text-white leading-tight break-words group-hover:text-primary transition-colors">
                                        {friend.displayName}
                                    </p>
                                    <UserRoleBadge role={friend.role} />
                                </div>
                                <p className="text-[9px] md:text-[10px] text-white/20 font-bold tracking-widest mt-0.5 uppercase">{friend.username}</p>
                            </div>
                        </button>

                        {isOwnProfile && onRemoveFriend && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveFriend(friend.uid, friend.displayName);
                                }}
                                className="p-3 text-white/10 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                title="Rimuovi Amico"
                            >
                                <UserMinus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
