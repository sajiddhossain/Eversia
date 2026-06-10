import React from 'react';
import type { EarnedBadge, BadgeTemplate, UserProfile } from '../../../types';
import { X, Calendar, Award, Pin, MessageSquare, ShieldCheck, Trash2, Lock, Check } from 'lucide-react';
import { RARITY_CONFIG } from '../../../utils/gamification';

interface BadgeDetailModalProps {
    earnedBadge?: EarnedBadge;
    template: BadgeTemplate;
    userProfile?: UserProfile;
    isOwn?: boolean;
    isPinned?: boolean;
    isAdmin?: boolean;
    onClose: () => void;
    onPinToggle?: () => void;
    onRemove?: () => void;
}

const CRITERIA_LABELS: Record<string, string> = {
    'XP_THRESHOLD': 'XP Richiesti',
    'ASSEMBLY_COUNT': 'Assemblee Partecipate',
    'STREAK': 'Serie di Accessi (Streak)',
    'FRIEND_COUNT': 'Amici Connessi',
    'CHECKIN_COUNT': 'Check-in Effettuati',
    'SECURITY_INSPECTIONS': 'Ispezioni di Sicurezza',
    'STAFF_ASSEMBLIES_COUNT': 'Ruoli Staff Coperti',
    'MANUAL': 'Assegnazione Speciale',
};

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({ 
    earnedBadge, 
    template, 
    userProfile,
    isOwn, 
    isPinned, 
    isAdmin,
    onClose, 
    onPinToggle,
    onRemove
}) => {
    const isEarned = !!earnedBadge;
    const rarity = RARITY_CONFIG[template.rarity] || RARITY_CONFIG.COMMON;
    
    const dateFormatted = isEarned ? new Intl.DateTimeFormat('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(earnedBadge.awardedAt)) : '';

    // Calculate progression details
    let currentValue = 0;
    let targetValue = template.criteria?.value || 1;
    let criteriaTypeLabel = template.criteria ? (CRITERIA_LABELS[template.criteria.type] || template.criteria.type) : 'Requisito';

    if (template.criteria) {
        const { type } = template.criteria;
        if (userProfile) {
            if (type === 'XP_THRESHOLD') {
                currentValue = userProfile.xp || 0;
            } else if (type === 'ASSEMBLY_COUNT') {
                currentValue = userProfile.totalAssemblies || 0;
            } else if (type === 'STREAK') {
                currentValue = userProfile.streak || 0;
            } else if (type === 'FRIEND_COUNT') {
                currentValue = userProfile.friends?.length ?? userProfile.friendCount ?? 0;
            } else if (type === 'CHECKIN_COUNT') {
                currentValue = userProfile.totalCheckIns || 0;
            } else if (type === 'SECURITY_INSPECTIONS') {
                currentValue = userProfile.securityInspections || 0;
            } else if (type === 'STAFF_ASSEMBLIES_COUNT') {
                currentValue = userProfile.staffAssembliesCount || 0;
            } else if (type === 'MANUAL') {
                currentValue = isEarned ? 1 : 0;
                targetValue = 1;
            }
        } else {
            currentValue = isEarned ? targetValue : 0;
        }
    } else {
        currentValue = isEarned ? 1 : 0;
        targetValue = 1;
        criteriaTypeLabel = 'Assegnazione Speciale';
    }

    const progressPercent = Math.min(100, Math.round((currentValue / targetValue) * 100));

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative w-full max-w-lg bg-surface border rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-500 ${
                isEarned ? rarity.borderGlow : 'border-white/10'
            } ${rarity.cardClass}`}>
                
                {/* Header Decoration */}
                <div className={`absolute top-0 left-0 right-0 h-40 bg-gradient-to-b opacity-20 pointer-events-none ${rarity.glowClass}`} />

                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all z-20"
                >
                    <X className="w-5 h-5 text-white/50" />
                </button>

                <div className="relative p-10 space-y-8">
                    {/* Badge Icon/Emoji */}
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className={`w-32 h-32 rounded-3xl border flex items-center justify-center bg-white/5 shadow-2xl transition-transform group-hover:scale-110 duration-700 ${
                                isEarned ? rarity.borderGlow : 'border-white/5 filter grayscale opacity-45'
                            }`}>
                                {template.emoji ? (
                                    <span className={`text-6xl drop-shadow-2xl ${!isEarned ? 'opacity-30' : ''}`}>{template.emoji}</span>
                                ) : (
                                    <Award className={`w-16 h-16 ${isEarned ? rarity.iconClass : 'text-white/20'}`} />
                                )}
                            </div>
                            {/* Orbital Rings */}
                            <div className="absolute inset-[-20px] rounded-full border border-white/5 animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-[-40px] rounded-full border border-white/5 animate-[spin_15s_linear_infinite] opacity-50" />
                        </div>
                    </div>

                    {/* Badge Info */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-tighter text-white/40">
                            {rarity.label} {!isEarned && '• Bloccato 🔒'}
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-white">{template.name}</h2>
                        <p className="text-sm text-white/60 leading-relaxed max-w-[80%] mx-auto">
                            {template.description}
                        </p>
                    </div>

                    {/* Metadata Grid (only if sbloccato) */}
                    {isEarned ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-primary/40" />
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Data Consegna</p>
                                    <p className="text-[10px] font-bold text-white/60 lowercase">{dateFormatted}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                                <ShieldCheck className="w-4 h-4 text-primary/40" />
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Assemblea</p>
                                    <p className="text-[10px] font-bold text-white/60 truncate max-w-[120px]">
                                        {earnedBadge.assemblyId || 'Generale'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-2xl p-4 flex items-center gap-3 text-white/40">
                            <Lock className="w-5 h-5 text-white/20 flex-shrink-0" />
                            <p className="text-[11px] font-bold leading-relaxed">
                                Questo badge è bloccato. Completa i requisiti di seguito per aggiungerlo alla tua bacheca.
                            </p>
                        </div>
                    )}

                    {/* Requisito Progress Bar */}
                    <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-wider text-white/30">
                            <span className="flex items-center gap-1.5">
                                {isEarned ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                ) : (
                                    <Lock className="w-3 h-3 text-white/30" />
                                )}
                                {criteriaTypeLabel}
                            </span>
                            <span className="text-white/60">{currentValue.toLocaleString()} / {targetValue.toLocaleString()}</span>
                        </div>
                        <div className="relative h-6 bg-black/60 border border-white/10 rounded-full overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
                            <div 
                                style={{ width: `${progressPercent}%` }}
                                className={`absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out rounded-full ${
                                    isEarned 
                                        ? 'bg-gradient-to-r from-emerald-600 via-brand-lime to-emerald-500' 
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                }`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-shimmer pointer-events-none" />
                            <span className="relative z-10 text-[9px] md:text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                {progressPercent}% {isEarned ? 'Completato' : 'In Corso'}
                            </span>
                        </div>
                    </div>

                    {/* Custom Message (only if sbloccato) */}
                    {isEarned && earnedBadge.customMessage && (
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60">
                                <MessageSquare className="w-3 h-3" /> Messaggio Speciale
                            </div>
                            <p className="text-xs text-primary/80 italic font-medium leading-relaxed">
                                "{earnedBadge.customMessage}"
                            </p>
                        </div>
                    )}

                    {/* Action Bar */}
                    {((isOwn && isEarned) || (isAdmin && isEarned)) && (
                        <div className="flex gap-3 pt-4">
                            {isOwn && isEarned && (
                                <button
                                    onClick={() => { onPinToggle?.(); }}
                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        isPinned 
                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                                            : 'bg-primary text-black hover:scale-[1.02]'
                                    }`}
                                >
                                    <Pin className="w-3.5 h-3.5" />
                                    {isPinned ? 'Rimuovi dal Profilo' : 'Fissa nel Profilo'}
                                </button>
                            )}
                            
                            {isAdmin && isEarned && (!template.criteria || template.criteria.type === 'MANUAL') && (
                                <button
                                    onClick={() => onRemove?.()}
                                    className="flex-1 py-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Revoca Badge
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Shine */}
                <div className="h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
        </div>
    );
};
