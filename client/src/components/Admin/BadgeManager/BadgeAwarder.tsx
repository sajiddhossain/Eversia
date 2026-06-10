import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../hooks/useAuth';
import type { UserProfile, BadgeTemplate, EarnedBadge } from '../../../types';
import { Search, CheckCircle2, Award, User, X, Loader2, Mail, Globe, Users } from 'lucide-react';
import { RARITY_CONFIG } from '../../../utils/gamification';
import { logAudit } from '../../../utils/auditLogger';

interface BadgeAwarderProps {
    allUsers: UserProfile[];
    badges: BadgeTemplate[];
    onBadgeAwarded?: () => void;
}

export const BadgeAwarder: React.FC<BadgeAwarderProps> = ({ allUsers, badges, onBadgeAwarded }) => {
    const { userProfile } = useAuth();
    const [search, setSearch] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
    const [selectedBadge, setSelectedBadge] = useState<string>('');
    const [customMessage, setCustomMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkEmails, setBulkEmails] = useState('');
    const [awardToAll, setAwardToAll] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const filteredUsers = allUsers.filter(u =>
        !selectedUsers.some(s => s.uid === u.uid) && (
            u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase())
        )
    ).slice(0, 6);

    const addUser = (u: UserProfile) => {
        setSelectedUsers(prev => [...prev, u]);
        setSearch('');
    };

    const removeUser = (uid: string) => {
        setSelectedUsers(prev => prev.filter(u => u.uid !== uid));
    };

    const getTargets = () => {
        let targets: UserProfile[] = [];
        if (isBulkMode) {
            if (awardToAll) {
                targets = allUsers;
            } else {
                const emails = bulkEmails.split(/[,\n]/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@'));
                targets = allUsers.filter(u => emails.includes(u.email.toLowerCase()));
            }
        } else {
            targets = selectedUsers;
        }
        return targets;
    };

    const handleAward = async () => {
        const targets = getTargets();
        if (targets.length === 0 || !selectedBadge) return;
        
        setLoading(true);
        try {
            const badge = badges.find(b => b.id === selectedBadge);

            // Check supply
            if (badge?.maxSupply) {
                const remaining = badge.maxSupply - (badge.currentSupply || 0);
                if (targets.length > remaining) {
                    alert(`Disponibilità insufficiente: solo ${remaining} badge rimasti.`);
                    setLoading(false);
                    return;
                }
            }

            const award: EarnedBadge = {
                badgeId: selectedBadge,
                awardedAt: Date.now(),
                awardedBy: userProfile?.uid || 'admin',
                customMessage: customMessage || null,
            };

            // Award to all target users
            await Promise.all(targets.map((u: UserProfile) =>
                updateDoc(doc(db, 'users', u.uid), { earnedBadges: arrayUnion(award) })
            ));

            // Update supply counter
            if (badge?.maxSupply) {
                await updateDoc(doc(db, 'badges', selectedBadge), {
                    currentSupply: increment(targets.length),
                });
            }

            // Log manual badge award in audit log
            const targetEmails = targets.map(u => u.email).filter(Boolean);
            await logAudit(
                'BADGE_AWARDED',
                userProfile?.email || 'System',
                `Assegnato manualmente badge: "${badge?.name || selectedBadge}" a ${targets.length} utenti: ${targetEmails.join(', ')}`
            );

            onBadgeAwarded?.();
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setSelectedUsers([]);
                setBulkEmails('');
                setAwardToAll(false);
                setSelectedBadge('');
                setCustomMessage('');
            }, 2500);
        } catch (err) {
            console.error("Error awarding badge:", err);
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    const selectedBadgeData = badges.find(b => b.id === selectedBadge);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User Selection */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                        <button
                            onClick={() => setIsBulkMode(false)}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!isBulkMode ? 'bg-primary text-black' : 'text-white/40 hover:text-white/60'}`}
                        >
                            Singolo / Ricerca
                        </button>
                        <button
                            onClick={() => setIsBulkMode(true)}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isBulkMode ? 'bg-primary text-black' : 'text-white/40 hover:text-white/60'}`}
                        >
                            Massivo / Email
                        </button>
                    </div>

                    {!isBulkMode ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                                    <Search className="w-3 h-3" /> Cerca Utenti
                                </label>
                                <input
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Nome, Email o @Username..."
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white text-sm focus:border-primary/40 transition-all outline-none"
                                />
                            </div>

                            {/* Search Results */}
                            {search && (
                                <div className="space-y-1.5">
                                    {filteredUsers.map(u => (
                                        <button
                                            key={u.uid}
                                            onClick={() => addUser(u)}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                <User className="w-4 h-4 text-white/15" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white/80 truncate">{u.displayName}</p>
                                                <p className="text-[9px] text-white/25 truncate">{u.username || u.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Selected Users */}
                            {selectedUsers.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                                        {selectedUsers.length} Selezionat{selectedUsers.length === 1 ? 'o' : 'i'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUsers.map(u => (
                                            <div key={u.uid} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-bold text-primary">
                                                {u.displayName?.split(' ')[0]}
                                                <button onClick={() => removeUser(u.uid)} className="hover:text-red-400 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                                    <Mail className="w-3 h-3" /> Lista Email (separate da virgola o a capo)
                                </label>
                                <button
                                    onClick={() => setAwardToAll(!awardToAll)}
                                    className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all text-[9px] font-black uppercase tracking-widest ${awardToAll ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/40'}`}
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    Tutti gli Utenti
                                </button>
                            </div>
                            
                            {!awardToAll ? (
                                <textarea
                                    value={bulkEmails} onChange={e => setBulkEmails(e.target.value)}
                                    placeholder="utente1@scuola.it, utente2@scuola.it..."
                                    className="w-full h-32 bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white text-sm focus:border-primary/40 transition-all outline-none resize-none font-mono"
                                />
                            ) : (
                                <div className="p-12 text-center border border-primary/20 bg-primary/5 rounded-[2rem] border-dashed space-y-3">
                                    <Users className="w-10 h-10 text-primary mx-auto opacity-40" />
                                    <div>
                                        <p className="text-primary font-black text-xs uppercase tracking-widest">Assegnazione Globale</p>
                                        <p className="text-[9px] text-primary/40 font-bold mt-1">Scegli un badge per assegnarlo a tutti i {allUsers.length} profili creati.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Badge & Award */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Scegli Badge</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {badges.map(b => {
                                const r = RARITY_CONFIG[b.rarity] || RARITY_CONFIG.COMMON;
                                const isSelected = selectedBadge === b.id;
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => setSelectedBadge(b.id)}
                                        className={`p-3 rounded-xl border transition-all text-left flex items-center gap-2.5 ${
                                            isSelected ? `${r.cardClass} scale-[1.02]` : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] text-white/40'
                                        }`}
                                    >
                                        <span className="text-lg flex-shrink-0">{b.emoji || '🏅'}</span>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black truncate">{b.name}</p>
                                            <p className="text-[8px] opacity-40">{r.label}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Supply warning */}
                    {selectedBadgeData?.maxSupply && (
                        <div className="text-[10px] font-bold text-amber-400/60 flex items-center gap-1.5">
                            <Award className="w-3 h-3" />
                            Edizione limitata: {selectedBadgeData.currentSupply || 0}/{selectedBadgeData.maxSupply} assegnati
                        </div>
                    )}

                    {/* Custom Message */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nota (Opzionale)</label>
                        <textarea
                            value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                            placeholder="Motivazione del premio..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white text-sm focus:border-primary/40 transition-all outline-none h-16 resize-none"
                        />
                    </div>

                    {/* Award Button */}
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={(!isBulkMode && selectedUsers.length === 0) || (isBulkMode && !awardToAll && !bulkEmails) || !selectedBadge || loading}
                        className="w-full py-3.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(226,243,60,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:grayscale flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                        {success ? `Operazione completata!` : isBulkMode ? (awardToAll ? `Assegna a TUTTI (${allUsers.length})` : 'Esegui Assegnazione Massiva') : `Assegna a ${selectedUsers.length || '...'} utent${selectedUsers.length === 1 ? 'e' : 'i'}`}
                    </button>

                    {success && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold text-center animate-in zoom-in-95 duration-300">
                            <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                            Badge assegnato con successo! ✨
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && selectedBadgeData && (
                <AwardConfirmModal 
                    badge={selectedBadgeData}
                    targetCount={getTargets().length}
                    customMessage={customMessage}
                    loading={loading}
                    onConfirm={handleAward}
                    onClose={() => setShowConfirm(false)}
                />
            )}
        </div>
    );
};

interface AwardConfirmModalProps {
    badge: BadgeTemplate;
    targetCount: number;
    customMessage: string;
    loading: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

const AwardConfirmModal: React.FC<AwardConfirmModalProps> = ({ badge, targetCount, customMessage, loading, onConfirm, onClose }) => {
    const r = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.COMMON;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10 mb-4">
                            <span className="text-3xl">{badge.emoji || '🏅'}</span>
                        </div>
                        <h3 className="text-xl font-black text-white">Conferma Assegnazione</h3>
                        <p className="text-xs text-white/40 leading-relaxed px-4">
                            Stai per assegnare il badge <span className="text-white font-bold">{badge.name}</span> a <span className="text-primary font-black">{targetCount} utent{targetCount === 1 ? 'e' : 'i'}</span>.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className={`p-4 rounded-2xl bg-white/[0.02] border ${r.borderGlow} flex items-center gap-4`}>
                            <div className="text-2xl">{badge.emoji || '🏅'}</div>
                            <div>
                                <p className="text-xs font-black text-white">{badge.name}</p>
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{badge.rarity}</p>
                            </div>
                        </div>

                        {customMessage && (
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-primary/40">Nota Inclusa</p>
                                <p className="text-[10px] text-primary/80 italic">"{customMessage}"</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="w-full py-3.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Sì, Procedi ora
                        </button>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="w-full py-3.5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Annulla
                        </button>
                    </div>
                </div>
                
                {/* Warning for bulk actions */}
                {targetCount > 10 && (
                    <div className="bg-amber-500/10 border-t border-amber-500/20 p-3 text-center">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.1em]">
                            ⚠️ Attenzione: Operazione massiva su {targetCount} utenti
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
