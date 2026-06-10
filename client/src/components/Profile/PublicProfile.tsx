import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, onSnapshot, increment, orderBy, limit } from 'firebase/firestore';

import { db, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import type { UserProfile } from '../../types';
import { ArrowLeft, Loader2, AlertCircle, Award, History, Pin, X, Users, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ProfileHeader } from './components/ProfileHeader';
import { BadgeShowcase } from './components/BadgeShowcase';
import { ActivityTimeline } from './components/ActivityTimeline';
import { AuthBarrier } from './components/AuthBarrier';
import { FriendsListPanel } from './components/FriendsListPanel';
import { logAudit } from '../../utils/auditLogger';

type Tab = 'OVERVIEW' | 'BADGES';

export const PublicProfile: React.FC = () => {
    const { username, uid: urlUid } = useParams();
    const navigate = useNavigate();
    const { userProfile: currentUser, user: authUser } = useAuth();

    const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<Tab>('BADGES');
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
    
    // Management states
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [friendshipState, setFriendshipState] = useState<'NONE' | 'PENDING' | 'RECEIVED' | 'FRIENDS'>('NONE');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!username && !urlUid) return;
            setLoading(true);
            setError(null);

            try {
                // 1. Resolve username or use UID directly
                let uid = urlUid;

                if (!uid && username) {
                    // Lowercase and decode for URL-safe consistency
                    const decoded = decodeURIComponent(username || '').toLowerCase();
                    const cleanUsername = decoded.startsWith('@') ? decoded : `@${decoded}`;
                    
                    const usernameSnap = await getDoc(doc(db, 'usernames', cleanUsername));
                    if (!usernameSnap.exists()) throw new Error("Utente non trovato.");
                    uid = usernameSnap.data().uid;
                }

                if (!uid) throw new Error("Parametri profilo mancanti.");

                // 2. Fetch profile
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (!userSnap.exists()) throw new Error("Profilo non trovato.");
                const data = userSnap.data() as UserProfile;
                setTargetProfile(data);


                // 5. Activity history (Only if logged in)
                if (authUser && data) {
                    const studentSnap = await getDocs(query(collection(db, 'students'), where('email', '==', data.email)));
                    // Limita a 30 assemblee più recenti per evitare letture illimitate
                    const assembliesSnap = await getDocs(query(collection(db, 'assemblies'), orderBy('date', 'desc'), limit(30)));

                    const statusMap: Record<string, boolean> = {};
                    const nameMap: Record<string, string> = {};
                    const dateMap: Record<string, string> = {};
                    assembliesSnap.forEach(d => { 
                        const a = d.data();
                        const id = d.id;
                        statusMap[id] = a.status === 'ATTIVA' || a.status === 'ISCRIZIONI_APERTE'; 
                        nameMap[id] = a.name || id;
                        dateMap[id] = a.date || '';
                    });

                    const enrollData: any[] = [];
                    const allAssemblyIds = new Set<string>();
                    studentSnap.forEach(d => {
                        const env = d.data();
                        enrollData.push(env);
                        if (env.assemblyId) allAssemblyIds.add(env.assemblyId);
                    });

                    // Fetch activities ONLY for active/open assemblies (to save reads)
                    const activityMap: Record<string, string> = {};
                    const activeAssemblyIds = Array.from(allAssemblyIds).filter(aid => statusMap[aid]);

                    if (activeAssemblyIds.length > 0) {
                        await Promise.all(activeAssemblyIds.map(async (aid) => {
                            const qRooms = query(collection(db, 'rooms'), where('assemblyId', '==', aid));
                            const roomSnap = await getDocs(qRooms);
                            roomSnap.forEach(rd => {
                                activityMap[rd.id] = rd.data().name || rd.id;
                            });
                        }));
                    }

                    const history: any[] = [];
                    enrollData.forEach(env => {
                        const aid = env.assemblyId || '';
                        
                        // Resolve activity names in scheduled_turns
                        const resolvedScheduled: Record<string, string | null> = {};
                        Object.entries(env.scheduled_turns || {}).forEach(([tid, actId]) => {
                            resolvedScheduled[tid] = activityMap[actId as string] || (actId as string);
                        });

                        history.push({ 
                            ...env, 
                            isActive: statusMap[aid] || false,
                            assemblyName: nameMap[aid] || aid || 'Assemblea Sconosciuta',
                            assemblyDate: dateMap[aid] || '',
                            resolved_activities: resolvedScheduled
                        });
                    });
                    setEnrollments(history);
                }

            } catch (err: any) {
                setError(err.message || "Errore sconosciuto.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username, urlUid, currentUser?.uid, authUser]);

    // 6. Real-time Friendship State
    useEffect(() => {
        if (!targetProfile || !currentUser) {
            setFriendshipState('NONE');
            return;
        }

        if (currentUser.uid === targetProfile.uid) {
            setFriendshipState('FRIENDS');
            return;
        }

        // Listener per i documenti utente (per aggiornamenti realtime di stats e amici)
        const unsubUser = onSnapshot(doc(db, 'users', targetProfile.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                setTargetProfile(data);
                
                if (data?.friends?.includes(currentUser.uid)) {
                    setFriendshipState('FRIENDS');
                } else if (friendshipState === 'FRIENDS') {
                    // Se eravamo amici e ora non lo siamo più (e non ci sono richieste pendenti)
                    setFriendshipState('NONE');
                }
            }
        }, (err) => {
            console.warn("[PublicProfile] User listener error:", err);
        });

        // Listener per le richieste pendenti
        const reqsRef = collection(db, 'friendRequests');
        const sentQ = query(reqsRef, where('from', '==', currentUser.uid), where('to', '==', targetProfile.uid), where('status', '==', 'PENDING'));
        const recvQ = query(reqsRef, where('from', '==', targetProfile.uid), where('to', '==', currentUser.uid), where('status', '==', 'PENDING'));

        const unsubSent = onSnapshot(sentQ, (snap) => {
            if (!snap.empty) setFriendshipState('PENDING');
            else {
                // If it was pending but now isn't, we might be friends or none
                // The unsubUser listener will catch the 'FRIENDS' case
                setFriendshipState(prev => prev === 'PENDING' ? 'NONE' : prev);
            }
        }, (err) => {
            console.warn("[PublicProfile] Sent requests listener error:", err);
        });

        const unsubRecv = onSnapshot(recvQ, (snap) => {
            if (!snap.empty) setFriendshipState('RECEIVED');
            else {
                setFriendshipState(prev => prev === 'RECEIVED' ? 'NONE' : prev);
            }
        }, (err) => {
            console.warn("[PublicProfile] Received requests listener error:", err);
        });

        return () => {
            unsubUser();
            unsubSent();
            unsubRecv();
        };
    }, [targetProfile?.uid, currentUser?.uid]);

    // Handlers
    const handleAddFriend = async () => {
        if (!currentUser || !targetProfile || friendshipState !== 'NONE') return;
        try {
            const sendFriendRequestFn = httpsCallable(functions, 'sendFriendRequest');
            await sendFriendRequestFn({ toUid: targetProfile.uid });
            setFriendshipState('PENDING');
        } catch (err) { console.error("Add friend error:", err); }
    };

    const handleAcceptFriend = async () => {
        if (!currentUser || !targetProfile || friendshipState !== 'RECEIVED') return;
        try {
            // 1. Find the request from target to me
            const reqsRef = collection(db, 'friendRequests');
            const q = query(reqsRef, where('from', '==', targetProfile.uid), where('to', '==', currentUser.uid), where('status', '==', 'PENDING'));
            const snap = await getDocs(q);
            if (snap.empty) return;

            const requestId = snap.docs[0].id;

            const acceptFriendRequestFn = httpsCallable(functions, 'acceptFriendRequest');
            await acceptFriendRequestFn({ requestId, fromUid: targetProfile.uid });

            setFriendshipState('FRIENDS');
        } catch (err) { console.error("Accept friend error:", err); }
    };

    const handleRemoveFriend = async () => {
        if (!currentUser || !targetProfile || friendshipState !== 'FRIENDS') return;
        if (!window.confirm(`Rimuovere ${targetProfile.displayName} dai tuoi amici?`)) return;

        try {
            const removeFriendFn = httpsCallable(functions, 'removeFriend');
            await removeFriendFn({ friendUid: targetProfile.uid });
            setFriendshipState('NONE');
        } catch (err) { console.error("Remove friend error:", err); }
    };

    const handlePinToggle = async (badgeId: string) => {
        if (!targetProfile) return;
        const currentPinned = targetProfile.pinnedBadges || [];
        const isPinned = currentPinned.includes(badgeId);
        const newPinned = isPinned ? currentPinned.filter(id => id !== badgeId) : [...currentPinned, badgeId];
        if (!isPinned && currentPinned.length >= 5) return;

        try {
            await updateDoc(doc(db, 'users', targetProfile.uid), { pinnedBadges: newPinned });
            setTargetProfile(prev => prev ? { ...prev, pinnedBadges: newPinned } : null);
        } catch (err) { console.error("Pin toggle error:", err); }
    };

    const handleRemoveBadge = async (badgeId: string) => {
        if (!targetProfile || !currentUser) return;
        const isUserAdmin = ['SVILUPPATORE', 'ADMIN'].includes(currentUser.role);
        if (!isUserAdmin) return;

        try {
            // Check if automatic badge (has criteria other than MANUAL)
            const badgeDoc = await getDoc(doc(db, 'badges', badgeId));
            if (badgeDoc.exists()) {
                const bData = badgeDoc.data();
                if (bData.criteria && bData.criteria.type !== 'MANUAL') {
                    alert("Non è possibile revocare un badge ad assegnazione automatica.");
                    return;
                }
            }

            if (!window.confirm("Sei sicuro di voler revocare questo badge? L'azione è irreversibile.")) return;

            // 1. Remove from user's earnedBadges
            const badgeToRemove = targetProfile.earnedBadges.find(b => b.badgeId === badgeId);
            if (!badgeToRemove) return;

            const userRef = doc(db, 'users', targetProfile.uid);
            // arrayRemove works only if the object is identical. 
            // Since we have awardedAt, we should be careful.
            const newEarned = targetProfile.earnedBadges.filter(b => b.badgeId !== badgeId || b.awardedAt !== badgeToRemove.awardedAt);
            
            // Also remove from pinned if present
            const isPinned = targetProfile.pinnedBadges?.includes(badgeId);
            const newPinned = isPinned ? targetProfile.pinnedBadges?.filter(id => id !== badgeId) : targetProfile.pinnedBadges;

            await updateDoc(userRef, { 
                earnedBadges: newEarned,
                pinnedBadges: newPinned || []
            });

            // 2. Decrement supply
            await updateDoc(doc(db, 'badges', badgeId), {
                currentSupply: increment(-1)
            });

            // Log audit event
            await logAudit('BADGE_REVOKED', currentUser.email || 'System', `Revocato badge: "${badgeId}" per l'utente: ${targetProfile.email}`);

            // 3. Update local state
            setTargetProfile(prev => prev ? { 
                ...prev, 
                earnedBadges: newEarned,
                pinnedBadges: newPinned || []
            } : null);

        } catch (err) {
            console.error("Error removing badge:", err);
            alert("Errore durante la rimozione del badge.");
        }
    };

    if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

    // Show Full-Page Auth Barrier for guests
    if (!authUser) {
        return (
            <AuthBarrier 
                fullPage 
                title={`Profilo di ${username || 'Studente'}`}
                message="Per vedere i badge, la cronologia e connetterti con questo studente, devi accedere con il tuo account istituzionale @liceoagnesi.edu.it"
            />
        );
    }

    if (error || !targetProfile) {
        return (
            <div className="max-w-md mx-auto px-6 py-24 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto"><AlertCircle className="w-10 h-10 text-red-400" /></div>
                <h2 className="text-2xl font-black">{error}</h2>
                <button onClick={() => navigate(-1)} className="text-primary font-bold text-sm flex items-center gap-2 mx-auto hover:gap-3 transition-all"><ArrowLeft className="w-4 h-4" /> Torna Indietro</button>
            </div>
        );
    }

    const isOwnProfile = currentUser?.uid === targetProfile.uid;

    const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
        { id: 'BADGES', label: 'Bacheca', icon: Award, badge: targetProfile.earnedBadges?.length || 0 },
        { id: 'OVERVIEW', label: 'Diario', icon: History },
    ];

    const isSystemAdmin = !!(currentUser && ['SVILUPPATORE', 'ADMIN'].includes(currentUser.role));
    const isProfilePrivateAndLocked = targetProfile.isPrivate === true && !isOwnProfile && friendshipState !== 'FRIENDS' && !isSystemAdmin;

    const handleRemoveSpecificFriend = async (friendUid: string, friendName: string) => {
        if (!currentUser) return;
        if (!window.confirm(`Rimuovere ${friendName} dai tuoi amici?`)) return;

        try {
            const removeFriendFn = httpsCallable(functions, 'removeFriend');
            await removeFriendFn({ friendUid });

            // If we just removed the friend whose profile we are viewing, update state
            if (targetProfile?.uid === friendUid) {
                setFriendshipState('NONE');
            }
        } catch (err) { console.error("Remove specific friend error:", err); }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8 md:space-y-12 animate-in fade-in zoom-in-[0.98] duration-700">
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-semibold font-display tracking-wider transition-all hover:gap-2.5 group select-none"
            >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" /> 
                Torna indietro
            </button>

            <div className="space-y-4">
                <ProfileHeader 
                    profile={targetProfile} 
                    isOwn={isOwnProfile} 
                    friendshipState={isOwnProfile ? undefined : friendshipState} 
                    onAddFriend={handleAddFriend} 
                    onAcceptFriend={handleAcceptFriend}
                    onRemoveFriend={handleRemoveFriend}
                    onEdit={() => navigate('/settings')}
                    onStatClick={isProfilePrivateAndLocked ? undefined : (section: string) => {
                        if (section === 'SOCIAL') setIsFriendsModalOpen(true);
                        else setActiveSection(section as Tab);
                    }}
                    isLocked={isProfilePrivateAndLocked}
                />
            </div>

            {!authUser ? (
                <div className="pt-8"><AuthBarrier /></div>
            ) : (
                <div className="space-y-10 md:space-y-16">
                    {isProfilePrivateAndLocked ? (
                        <div className="bg-white/[0.01] border border-white/5 border-dashed rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto animate-in fade-in duration-500">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10 shadow-inner">
                                <Lock className="w-6 h-6 text-white/30" />
                            </div>
                            <h3 className="text-lg font-bold font-display tracking-tight text-white/80">Questo profilo è privato</h3>
                            <p className="text-xs text-white/40 font-medium leading-relaxed max-w-sm mx-auto">
                                Invia una richiesta di amicizia per vedere i suoi badge e le sue attività di Eversia.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Navigation Tabs */}
                            <div className="flex gap-1.5 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl overflow-x-auto scrollbar-hide max-w-fit relative">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveSection(tab.id)}
                                        className={`relative flex-shrink-0 flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-semibold font-display transition-colors duration-300 select-none ${
                                            activeSection === tab.id ? 'text-white' : 'text-white/40 hover:text-white/80'
                                        }`}
                                    >
                                        {activeSection === tab.id && (
                                            <motion.div
                                                layoutId="profile-tab-indicator"
                                                className="absolute inset-0 bg-white/10 border border-white/5 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        <tab.icon className="w-4 h-4 relative z-10" />
                                        <span className="relative z-10">{tab.label}</span>
                                        {tab.badge !== undefined && tab.badge > 0 && (
                                            <span className={`relative z-10 ml-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold leading-none tabular-nums transition-all ${
                                                activeSection === tab.id ? 'bg-primary text-black font-extrabold' : 'bg-white/10 text-white/50'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                {activeSection === 'OVERVIEW' && (
                                        <div className="space-y-8 max-w-4xl">
                                            <SectionTitle icon={History} label="Cronologia Attività" />
                                            <ActivityTimeline enrollments={enrollments} />
                                        </div>
                                )}

                                {activeSection === 'BADGES' && (
                                    <div className="space-y-12 md:space-y-20">
                                        {/* Highlights Section - Full Width */}
                                        <div className="space-y-6">
                                            <SectionTitle icon={Pin} label="Badge in Evidenza" />
                                            <div className="bg-white/[0.01] border border-white/5 rounded-2xl md:rounded-[2.5rem] p-4 md:p-10">
                                                <BadgeShowcase 
                                                    earnedBadges={(targetProfile.earnedBadges || []).filter(b => targetProfile.pinnedBadges?.includes(b.badgeId))} 
                                                    pinnedBadgeIds={targetProfile.pinnedBadges} 
                                                    isOwn={isOwnProfile} 
                                                    isAdmin={isSystemAdmin}
                                                    onPinToggle={isOwnProfile ? handlePinToggle : undefined}
                                                    onRemove={isSystemAdmin ? handleRemoveBadge : undefined}
                                                    variant="HIGHLIGHT"
                                                    userProfile={targetProfile}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <SectionTitle icon={Award} label="Tutti i Badge" />
                                            <BadgeShowcase 
                                                earnedBadges={targetProfile.earnedBadges || []} 
                                                pinnedBadgeIds={targetProfile.pinnedBadges} 
                                                isOwn={isOwnProfile} 
                                                isAdmin={isSystemAdmin}
                                                onPinToggle={isOwnProfile ? handlePinToggle : undefined}
                                                onRemove={isSystemAdmin ? handleRemoveBadge : undefined}
                                                userProfile={targetProfile}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Friends Modal */}
            <AnimatePresence>
                {isFriendsModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                            onClick={() => setIsFriendsModalOpen(false)} 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="relative w-full max-w-lg bg-[#0e0e12]/95 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-2xl"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-lg font-bold font-display tracking-tight flex items-center gap-3 text-white">
                                    <Users className="w-5 h-5 text-primary" />
                                    <span>Amici di {targetProfile.displayName}</span>
                                </h3>
                                <button onClick={() => setIsFriendsModalOpen(false)} className="p-2 hover:bg-white/5 active:scale-95 rounded-xl transition-all">
                                    <X className="w-5 h-5 text-white/40 hover:text-white" />
                                </button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto p-6 custom-scrollbar soft-scroll-fade">
                                <FriendsListPanel 
                                    friendUids={targetProfile.friends || []} 
                                    targetName={targetProfile.displayName} 
                                    isOwnProfile={isOwnProfile} 
                                    onItemClick={() => setIsFriendsModalOpen(false)}
                                    onRemoveFriend={isOwnProfile ? handleRemoveSpecificFriend : undefined}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SectionTitle: React.FC<{ icon: React.ElementType; label: string }> = ({ icon: Icon, label }) => (
    <div className="flex items-center gap-3 select-none">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-primary/50 border border-white/5 shadow-inner">
            <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold font-display tracking-wide text-white/40">{label}</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
);
