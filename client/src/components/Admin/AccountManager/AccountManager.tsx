import React, { useState, useMemo, useEffect } from "react";
import { db, functions } from "../../../firebase";
import { httpsCallable } from "firebase/functions";
import { doc, runTransaction, collection, getDocs, query, updateDoc, arrayUnion, arrayRemove, limit, getCountFromServer } from "firebase/firestore";
import type { UserProfile, UserRole, BadgeTemplate } from "../../../types";
import { 
    X, Search, Lock, Users, Loader2, Edit2, Award, Trash2, Flame
} from "lucide-react";
import { logAudit } from "../../../utils/auditLogger";
import { calculateLevel } from "../../../utils/gamification";

const roleStyles: Record<string, string> = {
    'SVILUPPATORE': 'text-purple-400 border-purple-500/25 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
    'ADMIN': 'text-blue-400 border-blue-500/25 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.15)]',
    'ROOM_MANAGER': 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10',
    'SECURITY': 'text-amber-400 border-amber-500/25 bg-amber-500/10',
    'STUDENT': 'text-white/40 border-white/5 bg-white/5'
};

interface AccountManagerProps {
    currentUserProfile: UserProfile | null;
    onClose: () => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ 
    currentUserProfile,
    onClose 
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    
    // Edit Form State
    const [editDisplayName, setEditDisplayName] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editClassName, setEditClassName] = useState("");
    const [editBio, setEditBio] = useState("");
    const [editRole, setEditRole] = useState<UserRole>("STUDENT");
    const [editXp, setEditXp] = useState<number>(0);
    const [editStreak, setEditStreak] = useState<number>(0);
    const [userBadges, setUserBadges] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Available badges catalog
    const [availableBadges, setAvailableBadges] = useState<BadgeTemplate[]>([]);
    
    // Statically loaded initial users list (first 50) and total count
    const [localUsers, setLocalUsers] = useState<UserProfile[]>([]);
    const [totalUsersCount, setTotalUsersCount] = useState<number | null>(null);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    
    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const snap = await getDocs(query(collection(db, "badges")));
                setAvailableBadges(snap.docs.map(d => ({ id: d.id, ...d.data() } as BadgeTemplate)));
            } catch (err) {
                console.error("Error fetching badges:", err);
            }
        };
        const fetchInitialUsers = async () => {
            try {
                const countSnap = await getCountFromServer(collection(db, "users"));
                setTotalUsersCount(countSnap.data().count);
                
                const snap = await getDocs(query(collection(db, "users"), limit(50)));
                setLocalUsers(snap.docs.map(doc => doc.data() as UserProfile));
            } catch (err) {
                console.error("Error fetching initial users in AccountManager:", err);
            }
        };
        fetchBadges();
        fetchInitialUsers();
    }, []);

    // Debounced search via cloud function
    useEffect(() => {
        const activeRef = { current: true };
        const term = searchTerm.trim();
        if (term.length < 3) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const searchUsersFn = httpsCallable(functions, 'searchUsers');
                const res = await searchUsersFn({ queryText: term });
                if (!activeRef.current) return;
                setSearchResults(res.data as UserProfile[]);
            } catch (err) {
                console.error("Error searching users in AccountManager:", err);
            } finally {
                if (activeRef.current) setSearchLoading(false);
            }
        }, 500);

        return () => {
            activeRef.current = false;
            clearTimeout(timer);
        };
    }, [searchTerm]);

    // Open User Edit Mode
    const startEditing = (user: UserProfile) => {
        setEditingUser(user);
        setEditDisplayName(user.displayName || "");
        setEditUsername(user.username || "");
        setEditClassName(user.className || "");
        setEditBio(user.bio || "");
        setEditRole(user.role || "STUDENT");
        setEditXp(user.xp || 0);
        setEditStreak(user.streak || 0);
        setUserBadges(user.earnedBadges || []);
    };

    // Filtered display users (from preloaded 50 if query < 3, else search results)
    const displayedUsers = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (term.length >= 3) {
            return searchResults;
        }
        if (!term) return localUsers;
        return localUsers.filter(u => 
            `${u.displayName} ${u.email} ${u.username} ${u.className || ""}`.toLowerCase().includes(term)
        );
    }, [localUsers, searchResults, searchTerm]);

    // Award Badge to editing user
    const handleAwardBadge = async (badgeId: string) => {
        if (!editingUser) return;
        try {
            const badgeTemplate = availableBadges.find(b => b.id === badgeId);
            if (!badgeTemplate) return;

            const award = {
                badgeId,
                awardedAt: Date.now(),
                awardedBy: currentUserProfile?.email || 'System'
            };

            const userRef = doc(db, 'users', editingUser.uid);
            await updateDoc(userRef, {
                earnedBadges: arrayUnion(award)
            });

            setUserBadges(prev => [...prev, award]);
            
            const details = `Assegnato badge "${badgeTemplate.name}" a ${editingUser.email}`;
            await logAudit('CONFIG_CHANGED', currentUserProfile?.email || 'System', details, undefined, editingUser.uid);
            
            alert(`Badge "${badgeTemplate.name}" assegnato con successo!`);
        } catch (error: any) {
            console.error("Error awarding badge:", error);
            alert("Errore durante l'assegnazione del badge.");
        }
    };

    // Revoke Badge from editing user
    const handleRevokeBadge = async (badgeId: string) => {
        if (!editingUser) return;
        const badgeTemplate = availableBadges.find(b => b.id === badgeId);
        if (badgeTemplate?.criteria && badgeTemplate.criteria.type !== 'MANUAL') {
            alert("Non è possibile revocare manualmente un badge ad assegnazione automatica.");
            return;
        }
        if (!confirm("Sei sicuro di voler revocare questo badge?")) return;

        try {
            const userRef = doc(db, 'users', editingUser.uid);
            const badgeToRemove = userBadges.find(b => b.badgeId === badgeId);
            if (!badgeToRemove) return;

            await updateDoc(userRef, {
                earnedBadges: arrayRemove(badgeToRemove)
            });

            setUserBadges(prev => prev.filter(b => b.badgeId !== badgeId));
            
            const badgeTemplate = availableBadges.find(b => b.id === badgeId);
            const details = `Revocato badge "${badgeTemplate?.name || badgeId}" a ${editingUser.email}`;
            await logAudit('CONFIG_CHANGED', currentUserProfile?.email || 'System', details, undefined, editingUser.uid);
            
            alert("Badge revocato con successo!");
        } catch (error: any) {
            console.error("Error revoking badge:", error);
            alert("Errore durante la revoca del badge.");
        }
    };

    // Save Changes Transactionally
    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSaving(true);

        const targetUid = editingUser.uid;
        const targetEmail = editingUser.email.toLowerCase().trim();
        const userDocRef = doc(db, "users", targetUid);
        
        // Clean Username format
        let cleanUsername = editUsername.toLowerCase().trim().replace(/[^a-z0-9._]/g, '');
        if (cleanUsername && !cleanUsername.startsWith('@')) {
            cleanUsername = `@${cleanUsername}`;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userDocRef);
                if (!userSnap.exists()) {
                    throw new Error("L'utente non esiste più nel database.");
                }

                const userData = userSnap.data() as UserProfile;
                const oldUsername = userData.username || "";

                const updates: Record<string, any> = {
                    displayName: editDisplayName.trim(),
                    bio: editBio.trim().slice(0, 160),
                    className: editClassName.trim().toUpperCase().slice(0, 5) || null,
                    xp: Number(editXp),
                    level: calculateLevel(Number(editXp)),
                    streak: Number(editStreak)
                };

                // 1. Transactional Username Index Swap
                if (cleanUsername && cleanUsername !== oldUsername) {
                    const newUsernameRef = doc(db, "usernames", cleanUsername);
                    const newUsernameSnap = await transaction.get(newUsernameRef);
                    
                    if (newUsernameSnap.exists() && newUsernameSnap.data()?.uid !== targetUid) {
                        throw new Error(`Lo username ${cleanUsername} è già occupato da un altro utente.`);
                    }

                    // Set new index document
                    transaction.set(newUsernameRef, { uid: targetUid, email: targetEmail });
                    updates.username = cleanUsername;

                    // Delete old index document if it existed
                    if (oldUsername) {
                        const oldUsernameRef = doc(db, "usernames", oldUsername);
                        transaction.delete(oldUsernameRef);
                    }
                }

                // 2. Update main user profile document
                transaction.update(userDocRef, updates);
            });

            // Compute Changes Delta
            const changes: string[] = [];
            if (editDisplayName.trim() !== (editingUser.displayName || "")) {
                changes.push(`Nome: "${editingUser.displayName || ''}" → "${editDisplayName.trim()}"`);
            }
            if (cleanUsername !== (editingUser.username || "")) {
                changes.push(`Username: "${editingUser.username || ''}" → "${cleanUsername}"`);
            }
            if (editClassName.trim().toUpperCase() !== (editingUser.className || "")) {
                changes.push(`Classe: "${editingUser.className || ''}" → "${editClassName.trim().toUpperCase()}"`);
            }
            if (editBio.trim().slice(0, 160) !== (editingUser.bio || "")) {
                changes.push(`Bio modificata`);
            }
            if (Number(editXp) !== (editingUser.xp || 0)) {
                changes.push(`XP: ${editingUser.xp || 0} → ${Number(editXp)}`);
            }
            if (Number(editStreak) !== (editingUser.streak || 0)) {
                changes.push(`Streak: ${editingUser.streak || 0} → ${Number(editStreak)}`);
            }

            const details = `Modificato account di ${targetEmail}: ${changes.length > 0 ? changes.join(', ') : 'Nessuna variazione'}`;
            await logAudit('CONFIG_CHANGED', currentUserProfile?.email || 'System', details, undefined, targetUid);

            const updatedProfile: UserProfile = {
                ...editingUser,
                displayName: editDisplayName.trim(),
                bio: editBio.trim().slice(0, 160),
                className: editClassName.trim().toUpperCase().slice(0, 5) || undefined,
                xp: Number(editXp),
                level: calculateLevel(Number(editXp)),
                streak: Number(editStreak),
                username: cleanUsername
            };
            setLocalUsers(prev => prev.map(u => u.uid === targetUid ? updatedProfile : u));
            setSearchResults(prev => prev.map(u => u.uid === targetUid ? updatedProfile : u));

            setEditingUser(null);
            alert("Profilo utente aggiornato con successo!");
        } catch (error: any) {
            console.error("Save User Error:", error);
            alert(error.message || "Errore durante il salvataggio del profilo.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                        <Users className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-widest italic flex items-center gap-3">Gestione Account</h2>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                            Anagrafiche globali, ruoli e classi {totalUsersCount !== null ? `(Totale: ${totalUsersCount} utenti)` : ""}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all active:scale-95">
                    <X className="w-6 h-6 text-white/30 hover:text-white" />
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* User List Panel */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
                    {/* Search bar */}
                    <div className="p-6 border-b border-white/5 bg-black/10">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cerca per nome, email, username o classe..."
                                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold outline-none focus:border-purple-500/30 transition-all placeholder:text-white/10 focus:ring-1 focus:ring-purple-500/10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Users list view */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                        {searchLoading ? (
                            <div className="py-24 text-center">
                                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                                <p className="font-bold text-sm uppercase tracking-widest text-white/30 animate-pulse">Ricerca in corso...</p>
                            </div>
                        ) : displayedUsers.length === 0 ? (
                          <div className="py-24 text-center text-white/20">
                              <Search className="w-12 h-12 mx-auto mb-4 opacity-25 text-purple-400" />
                              <p className="font-bold text-sm uppercase tracking-widest">Nessun utente trovato</p>
                          </div>
                        ) : displayedUsers.map(user => {
                            const isCurrentUser = currentUserProfile?.uid === user.uid;
                            const initials = (user.displayName || "E").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

                            return (
                                <div 
                                    key={user.uid}
                                    className={`p-4 bg-white/[0.01] hover:bg-white/[0.03] border rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 ${
                                        editingUser?.uid === user.uid ? 'border-purple-500/30 bg-purple-500/[0.02]' : 'border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        {/* Profile Avatar */}
                                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-black text-sm text-white/30 border border-white/10 shrink-0">
                                            {initials}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="font-black text-sm uppercase tracking-tight flex items-center gap-2 truncate">
                                                {user.displayName}
                                                {isCurrentUser && (
                                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-[7px] font-black text-purple-400 uppercase tracking-widest leading-none">
                                                        Tu
                                                    </span>
                                                )}
                                                {user.className && (
                                                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-bold text-white/40 leading-none">
                                                        {user.className}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-white/30 font-bold tracking-wider mt-1 truncate">
                                                {user.username || "@no_username"} • <span className="italic select-all">{user.email}</span>
                                            </div>

                                            {/* Gamification Stats Row */}
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] font-black uppercase tracking-wider text-white/45">
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                                    <span className="text-[7.5px] text-purple-400 font-bold">LVL {calculateLevel(user.xp || 0)}</span>
                                                    <span>{user.xp || 0} XP</span>
                                                </span>
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
                                                    (user.streak || 0) > 0 
                                                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' 
                                                        : 'bg-white/5 border-white/5 text-white/20'
                                                }`}>
                                                    🔥 {user.streak || 0}
                                                </span>
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
                                                    (user.earnedBadges?.length || 0) > 0 
                                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                                        : 'bg-white/5 border-white/5 text-white/20'
                                                }`}>
                                                    🏆 {user.earnedBadges?.length || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Options & Action */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                            roleStyles[user.role] || roleStyles.STUDENT
                                        }`}>
                                            {user.role}
                                        </span>
                                        <button
                                            onClick={() => startEditing(user)}
                                            className="p-2.5 bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/10 text-white/40 hover:text-purple-400 rounded-xl transition-all btn-press"
                                            title="Modifica Utente"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Edit Panel (Conditional Sidebar) */}
                <div className={`w-full md:w-96 bg-black/20 overflow-y-auto p-6 md:p-8 custom-scrollbar border-t md:border-t-0 md:border-l border-white/5 transition-all duration-300 ${
                    editingUser ? 'block' : 'hidden md:flex flex-col items-center justify-center text-white/10'
                }`}>
                    {editingUser ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Panel header */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                                    <Lock className="w-4 h-4" /> Modifica Profilo
                                </h3>
                                <button 
                                    onClick={() => setEditingUser(null)} 
                                    className="p-1 hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4 text-white/40 hover:text-white" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSaveUser} className="space-y-5">
                                {/* Display Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all"
                                        value={editDisplayName}
                                        onChange={e => setEditDisplayName(e.target.value)}
                                    />
                                </div>

                                {/* Username */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Username (@)</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all font-mono"
                                        value={editUsername}
                                        onChange={e => setEditUsername(e.target.value)}
                                    />
                                </div>

                                {/* Class/Section */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Classe / Sezione</label>
                                    <input
                                        type="text"
                                        placeholder="es. 5BS"
                                        className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all"
                                        value={editClassName}
                                        onChange={e => setEditClassName(e.target.value)}
                                    />
                                </div>

                                {/* Biography */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">
                                        <span>Bio</span>
                                        <span>{editBio.length}/160</span>
                                    </div>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all resize-none"
                                        value={editBio}
                                        onChange={e => setEditBio(e.target.value.slice(0, 160))}
                                    />
                                </div>

                                {/* Gamification (XP & Streak) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">
                                            XP (Livello {calculateLevel(editXp)})
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all"
                                            value={editXp}
                                            onChange={e => setEditXp(Math.max(0, parseInt(e.target.value) || 0))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">
                                            Streak (Giorni)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 pl-8 pr-4 text-sm font-bold outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all font-mono"
                                                value={editStreak}
                                                onChange={e => setEditStreak(Math.max(0, parseInt(e.target.value) || 0))}
                                            />
                                            <Flame className="w-3.5 h-3.5 text-orange-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>
                                </div>

                                {/* Role Display (Read-Only) */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Ruolo Piattaforma</label>
                                    <div className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-white/60 flex items-center justify-between gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${
                                            roleStyles[editRole] || roleStyles.STUDENT
                                        }`}>
                                            {editRole}
                                        </span>
                                        <span className="text-[8px] text-white/20 font-black uppercase tracking-widest italic shrink-0 select-none">
                                            Non Modificabile
                                        </span>
                                    </div>
                                </div>

                                {/* Student Badges Section */}
                                <div className="space-y-3 pt-2">
                                    <div className="border-t border-white/5 pt-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2 mb-2">
                                            <Award className="w-4 h-4" /> Badge Guadagnati ({userBadges.length})
                                        </h4>
                                    </div>
                                    
                                    {/* Earned Badges List */}
                                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {userBadges.length === 0 ? (
                                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider py-2 pl-1">
                                                Nessun badge assegnato.
                                            </p>
                                        ) : (
                                            userBadges.map(eb => {
                                                const template = availableBadges.find(b => b.id === eb.badgeId);
                                                if (!template) return null;
                                                return (
                                                    <div key={eb.badgeId + eb.awardedAt} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs gap-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-base shrink-0">{template.emoji || '🏆'}</span>
                                                            <div className="min-w-0">
                                                                <p className="font-black uppercase text-[10px] tracking-tight truncate text-white">{template.name}</p>
                                                                <p className="text-[8px] text-white/30 uppercase font-black tracking-wider leading-none mt-0.5">
                                                                    {template.rarity}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {(!template.criteria || template.criteria.type === 'MANUAL') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRevokeBadge(eb.badgeId)}
                                                                className="p-1.5 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/20 transition-all shrink-0 active:scale-95"
                                                                title="Revoca Badge"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Award Badge Form */}
                                    {availableBadges.filter(ab => !userBadges.some(ub => ub.badgeId === ab.id)).length > 0 && (
                                        <div className="flex gap-2 items-center bg-white/[0.01] border border-white/5 p-2 rounded-xl">
                                            <select
                                                id="badge-selector"
                                                className="flex-1 bg-black/60 border border-white/5 rounded-lg py-2 px-2.5 text-[10px] font-black uppercase tracking-wider text-white focus:outline-none focus:border-purple-500/30"
                                                defaultValue=""
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val) {
                                                        handleAwardBadge(val);
                                                        e.target.value = ""; // Reset selector
                                                    }
                                                }}
                                            >
                                                <option value="" disabled className="bg-[#09090b]">Assegna un Badge...</option>
                                                {availableBadges
                                                    .filter(ab => !userBadges.some(ub => ub.badgeId === ab.id))
                                                    .map(ab => (
                                                        <option key={ab.id} value={ab.id} className="bg-[#09090b]">
                                                            {ab.emoji || '🏆'} {ab.name} ({ab.rarity})
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-purple-500 text-black py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-purple-500/10 btn-press"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva Modifiche"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-12 h-full">
                            <Lock className="w-8 h-8 opacity-20 mb-3 text-purple-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                Seleziona un utente<br />per modificare i dati
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
