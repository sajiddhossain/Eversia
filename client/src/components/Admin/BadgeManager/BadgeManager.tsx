import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../hooks/useAuth';
import type { BadgeTemplate, UserProfile, BadgeRarity, BadgeCategory, BadgeCriteriaType } from '../../../types';
import { Award, Plus, Trash2, X, Loader2, UserPlus, Star, Zap, Gem, Trophy, Crown, Heart, Shield, Target, Eye, Users, Search, ExternalLink, Calendar, User } from 'lucide-react';
import { BadgeAwarder } from './BadgeAwarder';
import { RARITY_CONFIG, CATEGORY_LABELS } from '../../../utils/gamification';
import { logAudit } from '../../../utils/auditLogger';

interface BadgeManagerProps {
    onClose: () => void;
}

const RARITIES: BadgeRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
const CATEGORIES: { id: BadgeCategory; label: string; emoji: string }[] = [
    { id: 'PARTICIPATION', label: 'Partecipazione', emoji: '🎯' },
    { id: 'ACHIEVEMENT', label: 'Achievement', emoji: '🏆' },
    { id: 'SOCIAL', label: 'Social', emoji: '👥' },
    { id: 'SPECIAL', label: 'Speciali', emoji: '⭐' },
    { id: 'STAFF', label: 'Staff', emoji: '🛡️' },
];

const ICON_OPTIONS: { name: string; icon: React.ElementType }[] = [
    { name: 'Award', icon: Award },
    { name: 'Star', icon: Star },
    { name: 'Zap', icon: Zap },
    { name: 'Gem', icon: Gem },
    { name: 'Trophy', icon: Trophy },
    { name: 'Crown', icon: Crown },
    { name: 'Heart', icon: Heart },
    { name: 'Shield', icon: Shield },
    { name: 'Target', icon: Target },
];

export const BadgeManager: React.FC<BadgeManagerProps> = ({ onClose }) => {
    const { userProfile } = useAuth();
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'AWARD'>('LIST');
    const [badges, setBadges] = useState<BadgeTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingOwnersBadgeId, setViewingOwnersBadgeId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [rarity, setRarity] = useState<BadgeRarity>('COMMON');
    const [category, setCategory] = useState<BadgeCategory>('SPECIAL');
    const [iconName, setIconName] = useState('Award');
    const [emoji, setEmoji] = useState('');
    const [maxSupply, setMaxSupply] = useState<string>('');
    const [criteriaType, setCriteriaType] = useState<BadgeCriteriaType>('MANUAL');
    const [criteriaValue, setCriteriaValue] = useState<string>('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchBadges();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'users')));
            setAllUsers(snap.docs.map(doc => doc.data() as UserProfile));
        } catch (err) {
            console.error("Error fetching users for badge manager:", err);
        }
    };

    const fetchBadges = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, 'badges')));
            setBadges(snap.docs.map(d => ({ id: d.id, ...d.data() } as BadgeTemplate)));
        } catch (err) { console.error("Error fetching badges:", err); }
        finally { setLoading(false); }
    };

    const handleCreateBadge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setCreating(true);
        try {
            const newBadge: Omit<BadgeTemplate, 'id'> = {
                name: name.trim(),
                description: description.trim(),
                rarity,
                category,
                iconName,
                emoji: emoji || null,
                isAssemblySpecific: false,
                maxSupply: maxSupply ? parseInt(maxSupply) : null,
                currentSupply: 0,
                criteria: {
                    type: criteriaType,
                    value: criteriaType !== 'MANUAL' ? parseInt(criteriaValue) : undefined
                },
                colorScheme: { text: '', background: '', border: '' },
                createdAt: Date.now(),
                createdBy: userProfile?.uid || 'system',
            };
            await addDoc(collection(db, 'badges'), newBadge);
            await logAudit('BADGE_CREATED', userProfile?.email || 'System', `Creato template badge: "${newBadge.name}" (Rarità: ${newBadge.rarity}, Categoria: ${newBadge.category})`);
            setActiveTab('LIST');
            fetchBadges();
            setName(''); setDescription(''); setEmoji(''); setMaxSupply(''); setCriteriaType('MANUAL'); setCriteriaValue('');
        } catch (err) { console.error("Error creating badge:", err); }
        finally { setCreating(false); }
    };

    const handleDeleteBadge = async (id: string) => {
        const badgeToDelete = badges.find(b => b.id === id);
        if (badgeToDelete?.criteria && badgeToDelete.criteria.type !== 'MANUAL') {
            alert("Non è possibile eliminare i template di badge ad assegnazione automatica.");
            return;
        }

        if (!window.confirm("Eliminare questo badge? I badge già assegnati resteranno nei profili.")) return;
        try {
            await deleteDoc(doc(db, 'badges', id));
            await logAudit('BADGE_DELETED', userProfile?.email || 'System', `Eliminato template badge: "${badgeToDelete?.name || id}"`);
            fetchBadges();
        }
        catch (err) { console.error("Error deleting badge:", err); }
    };

    const handleRemoveBadgeFromMember = async (userId: string, badgeId: string) => {
        const badgeData = badges.find(b => b.id === badgeId);
        if (badgeData?.criteria && badgeData.criteria.type !== 'MANUAL') {
            alert("Non è possibile revocare manualmente un badge ad assegnazione automatica.");
            return;
        }

        if (!window.confirm("Revocare questo badge all'utente?")) return;
        
        try {
            const user = allUsers.find(u => u.uid === userId);
            if (!user) return;

            const badgeToRemove = user.earnedBadges.find(b => b.badgeId === badgeId);
            if (!badgeToRemove) return;

            // Update User
            const newEarned = user.earnedBadges.filter(b => b.badgeId !== badgeId || b.awardedAt !== badgeToRemove.awardedAt);
            const newPinned = user.pinnedBadges?.filter(id => id !== badgeId) || [];
            
            await updateDoc(doc(db, 'users', userId), {
                earnedBadges: newEarned,
                pinnedBadges: newPinned
            });

            // Update Badge Supply
            await updateDoc(doc(db, 'badges', badgeId), {
                currentSupply: increment(-1)
            });

            const badgeData = badges.find(b => b.id === badgeId);
            await logAudit('BADGE_REVOKED', userProfile?.email || 'System', `Revocato badge: "${badgeData?.name || badgeId}" per l'utente: ${user.email}`);

            fetchBadges(); // Refresh supply counts
        } catch (err) {
            console.error("Error removing badge from member:", err);
            alert("Errore durante la revoca del badge.");
        }
    };

    // Preview rarity
    const previewRarity = RARITY_CONFIG[rarity];

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <Award className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight">Badge Studio</h2>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">{badges.length} Badge Creati</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95">
                    <X className="w-5 h-5 text-white/40" />
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 md:px-8 pt-5 flex gap-2">
                {[
                    { id: 'LIST' as const, label: 'Catalogo', icon: Eye },
                    { id: 'CREATE' as const, label: 'Crea', icon: Plus },
                    { id: 'AWARD' as const, label: 'Assegna', icon: UserPlus },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id
                                ? 'bg-primary text-black shadow-[0_0_15px_rgba(226,243,60,0.15)]'
                                : 'text-white/30 hover:text-white/50 hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {activeTab === 'LIST' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading ? (
                            <div className="col-span-full py-16 flex justify-center">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                        ) : badges.length === 0 ? (
                            <div className="col-span-full py-16 text-center space-y-3">
                                <Award className="w-12 h-12 text-white/5 mx-auto" />
                                <p className="text-sm text-white/20 font-bold">Nessun badge creato</p>
                            </div>
                        ) : badges.map(badge => {
                            const r = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.COMMON;
                            const cat = CATEGORY_LABELS[badge.category] || CATEGORY_LABELS.SPECIAL;
                            return (
                                <div key={badge.id} className={`border rounded-2xl p-5 relative group hover:scale-[1.02] transition-all ${r.cardClass} ${r.borderGlow}`}>
                                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => setViewingOwnersBadgeId(badge.id)}
                                            className="p-1.5 text-white/20 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                            title="Vedi proprietari"
                                        >
                                            <Users className="w-3.5 h-3.5" />
                                        </button>
                                        {(!badge.criteria || badge.criteria.type === 'MANUAL') && (
                                            <button
                                                onClick={() => handleDeleteBadge(badge.id)}
                                                className="p-1.5 text-white/10 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Elimina template"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-start gap-3.5 mb-3">
                                        <div className="text-2xl">{badge.emoji || '🏅'}</div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-sm truncate">{badge.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[8px] font-black uppercase tracking-wider opacity-60">{r.label}</span>
                                                <span className="text-[8px] font-bold opacity-30">•</span>
                                                <span className="text-[8px] font-bold opacity-30">{cat.emoji} {cat.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] opacity-40 line-clamp-2">{badge.description}</p>
                                    {badge.maxSupply && (
                                        <div className="mt-2 text-[9px] font-bold opacity-25">
                                            {badge.currentSupply || 0}/{badge.maxSupply} assegnati
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'CREATE' && (
                    <form onSubmit={handleCreateBadge} className="max-w-2xl space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nome Badge</label>
                                <input
                                    value={name} onChange={e => setName(e.target.value)} required
                                    placeholder="es. Primo Passo"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white focus:border-primary/40 transition-all outline-none text-sm"
                                />
                            </div>

                            {/* Emoji */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Emoji (Opzionale)</label>
                                <input
                                    value={emoji} onChange={e => setEmoji(e.target.value)}
                                    placeholder="🌟"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white focus:border-primary/40 transition-all outline-none text-2xl text-center"
                                    maxLength={2}
                                />
                            </div>

                            {/* Rarity */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Rarità</label>
                                <div className="flex gap-1.5">
                                    {RARITIES.map(r => (
                                        <button
                                            key={r} type="button"
                                            onClick={() => setRarity(r)}
                                            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${
                                                rarity === r
                                                    ? `${RARITY_CONFIG[r].cardClass} border`
                                                    : 'bg-white/[0.03] text-white/20 border border-transparent hover:bg-white/[0.06]'
                                            }`}
                                        >
                                            {RARITY_CONFIG[r].label.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Categoria</label>
                                <select
                                    value={category} onChange={e => setCategory(e.target.value as BadgeCategory)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white focus:border-primary/40 transition-all outline-none text-sm appearance-none"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Automatic Badge Unlock Criteria Selection Section */}
                        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 animate-pulse text-primary" />
                                Criteri di Sblocco Automatico
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Tipo di Criterio</label>
                                    <select
                                        value={criteriaType} onChange={e => setCriteriaType(e.target.value as BadgeCriteriaType)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white focus:border-primary/40 transition-all outline-none text-sm appearance-none"
                                    >
                                        <option value="MANUAL" className="bg-[#09090b]">Assegnazione Manuale (Admin)</option>
                                        <option value="XP_THRESHOLD" className="bg-[#09090b]">Soglia XP Totali</option>
                                        <option value="ASSEMBLY_COUNT" className="bg-[#09090b]">Numero Assemblee Frequentate</option>
                                        <option value="STREAK" className="bg-[#09090b]">Serie di Check-in Attiva (Streak)</option>
                                        <option value="FRIEND_COUNT" className="bg-[#09090b]">Numero Amici Aggiunti</option>
                                        <option value="CHECKIN_COUNT" className="bg-[#09090b]">Numero Check-in Totali</option>
                                    </select>
                                </div>
                                {criteriaType !== 'MANUAL' && (
                                    <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Valore Soglia</label>
                                        <input
                                            type="number" min="1" required
                                            value={criteriaValue} onChange={e => setCriteriaValue(e.target.value)}
                                            placeholder="es. 100"
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white focus:border-primary/40 transition-all outline-none text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Icon Picker */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Icona Fallback</label>
                            <div className="flex gap-2 flex-wrap">
                                {ICON_OPTIONS.map(({ name: iName, icon: Icon }) => (
                                    <button
                                        key={iName} type="button"
                                        onClick={() => setIconName(iName)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                            iconName === iName
                                                ? 'bg-primary/10 text-primary border border-primary/30 scale-110'
                                                : 'bg-white/[0.03] text-white/20 border border-transparent hover:bg-white/5'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Descrizione</label>
                            <textarea
                                value={description} onChange={e => setDescription(e.target.value)} required
                                placeholder="Motivo del premio..."
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white focus:border-primary/40 transition-all outline-none h-20 resize-none text-sm"
                            />
                        </div>

                        {/* Max Supply */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                Edizione Limitata (Opzionale)
                            </label>
                            <input
                                type="number" min="1"
                                value={maxSupply} onChange={e => setMaxSupply(e.target.value)}
                                placeholder="Lascia vuoto per illimitati"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white focus:border-primary/40 transition-all outline-none text-sm"
                            />
                        </div>

                        {/* Preview */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Anteprima</label>
                            <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border ${previewRarity.cardClass} ${previewRarity.borderGlow}`}>
                                <span className="text-xl">{emoji || '🏅'}</span>
                                <div>
                                    <p className="text-xs font-black">{name || 'Nome Badge'}</p>
                                    <p className="text-[8px] font-bold opacity-50">{previewRarity.label}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit" disabled={creating}
                            className="px-8 py-3.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(226,243,60,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {creating ? 'Creazione...' : 'Crea Badge'}
                        </button>
                    </form>
                )}

                {activeTab === 'AWARD' && (
                    <BadgeAwarder allUsers={allUsers} badges={badges} onBadgeAwarded={fetchBadges} />
                )}
            </div>

            {/* Owners Modal */}
            {viewingOwnersBadgeId && (
                <BadgeOwnersModal 
                    badge={badges.find(b => b.id === viewingOwnersBadgeId)!}
                    allUsers={allUsers}
                    onClose={() => setViewingOwnersBadgeId(null)}
                    onRemove={handleRemoveBadgeFromMember}
                />
            )}
        </div>
    );
};

interface BadgeOwnersModalProps {
    badge: BadgeTemplate;
    allUsers: UserProfile[];
    onClose: () => void;
    onRemove: (userId: string, badgeId: string) => Promise<void>;
}

const BadgeOwnersModal: React.FC<BadgeOwnersModalProps> = ({ badge, allUsers, onClose, onRemove }) => {
    const [search, setSearch] = useState('');
    
    const owners = allUsers.filter(u => 
        u.earnedBadges?.some(eb => eb.badgeId === badge.id) &&
        (u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    ).map(u => {
        const earned = u.earnedBadges?.find(eb => eb.badgeId === badge.id);
        return { ...u, earnedAt: earned?.awardedAt || 0 };
    }).sort((a, b) => b.earnedAt - a.earnedAt);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl">{badge.emoji || '🏅'}</div>
                        <div>
                            <h3 className="text-xl font-black text-white">{badge.name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                {owners.length} Proprietar{owners.length === 1 ? 'io' : 'i'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/20" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 md:p-6 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input 
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Cerca per nome o email..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-xs focus:border-primary/40 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar">
                    {owners.length === 0 ? (
                        <div className="py-20 text-center space-y-3 opacity-20">
                            <Users className="w-12 h-12 mx-auto" />
                            <p className="text-sm font-bold">Nessun utente trovato</p>
                        </div>
                    ) : (
                        owners.map(user => (
                            <div key={user.uid} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group/member">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5">
                                        <User className="w-5 h-5 text-white/20" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                                            <a href={`/profile/${user.username || user.uid}`} target="_blank" rel="noreferrer" className="opacity-0 group-hover/member:opacity-100 transition-opacity">
                                                <ExternalLink className="w-3 h-3 text-primary" />
                                            </a>
                                        </div>
                                        <p className="text-[9px] font-medium text-white/40 truncate">{user.email}</p>
                                        <div className="flex items-center gap-1.5 mt-1 text-[8px] font-black uppercase tracking-tighter text-white/20">
                                            <Calendar className="w-2.5 h-2.5" />
                                            Assegnato il {new Date(user.earnedAt).toLocaleDateString('it-IT')}
                                        </div>
                                    </div>
                                </div>
                                
                                {(!badge.criteria || badge.criteria.type === 'MANUAL') && (
                                    <button
                                        onClick={() => onRemove(user.uid, badge.id)}
                                        className="px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Revoca
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
