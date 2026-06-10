import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { BadgeTemplate, EarnedBadge, UserProfile } from '../../types';
import { Award, Star, Zap, Gem, Trophy, Loader2, Crown, Heart, Shield, Target, Lock } from 'lucide-react';
import { RARITY_CONFIG } from '../../utils/gamification';

interface BadgeItemProps {
    earnedBadge?: EarnedBadge;
    template?: BadgeTemplate;
    locked?: boolean;
    userProfile?: UserProfile;
    onClick?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
    Award, Star, Zap, Gem, Trophy, Crown, Heart, Shield, Target,
};

export const BadgeItem: React.FC<BadgeItemProps> = ({ earnedBadge, template: preloaded, locked = false, userProfile, onClick }) => {
    const [template, setTemplate] = useState<BadgeTemplate | null>(preloaded || null);
    const [loading, setLoading] = useState(!preloaded);

    useEffect(() => {
        if (preloaded) { setTemplate(preloaded); setLoading(false); return; }
        const fetchTemplate = async () => {
            try {
                if (earnedBadge) {
                    const snap = await getDoc(doc(db, 'badges', earnedBadge.badgeId));
                    if (snap.exists()) setTemplate({ id: snap.id, ...snap.data() } as BadgeTemplate);
                }
            } catch {} finally { setLoading(false); }
        };
        fetchTemplate();
    }, [earnedBadge?.badgeId, preloaded]);

    if (loading) {
        return (
            <div className="aspect-square bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white/10 animate-spin" />
            </div>
        );
    }

    if (!template) {
        return (
            <div className="aspect-square bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1.5 opacity-40">
                <Award className="w-5 h-5 text-white/20" />
                <span className="text-[7px] font-black uppercase text-white/15">N/D</span>
            </div>
        );
    }

    const rarity = RARITY_CONFIG[template.rarity] || RARITY_CONFIG.COMMON;
    const IconComponent = ICON_MAP[template.iconName] || Award;
    const displayEmoji = template.emoji;

    // Cyber rarity animation/glow classes
    let animationClass = '';
    if (!locked) {
        if (template.rarity === 'LEGENDARY') animationClass = 'animate-pulse-glow-lime border-brand-lime/50 text-brand-lime shadow-brand-lime/5';
        else if (template.rarity === 'EPIC') animationClass = 'animate-pulse-glow-purple border-purple-500/50 text-purple-400 shadow-purple-500/5';
        else if (template.rarity === 'RARE') animationClass = 'animate-pulse-glow-cyan border-cyan-500/50 text-cyan-400 shadow-cyan-500/5';
        else if (template.rarity === 'UNCOMMON') animationClass = 'animate-pulse-glow-emerald border-emerald-500/35 text-emerald-400 shadow-emerald-500/5';
        else animationClass = 'animate-pulse-glow-white border-white/10 text-white/50 shadow-white/5';
    }

    const cardStyle = locked
        ? 'bg-white/[0.01] border-white/5 text-white/20 filter grayscale contrast-75 brightness-[0.55] hover:brightness-[0.7] hover:scale-[1.01]'
        : `${rarity.cardClass} ${rarity.borderGlow} ${animationClass} hover:-translate-y-1.5 active:scale-[0.98]`;

    // Calculate progress percentage for locked badges with criteria
    let progressPercent = 0;
    let progressText = '';
    if (locked && template && template.criteria && userProfile) {
        const { type, value = 1 } = template.criteria;
        let currentValue = 0;
        if (type === 'XP_THRESHOLD') currentValue = userProfile.xp || 0;
        else if (type === 'ASSEMBLY_COUNT') currentValue = userProfile.totalAssemblies || 0;
        else if (type === 'STREAK') currentValue = userProfile.streak || 0;
        else if (type === 'FRIEND_COUNT') currentValue = userProfile.friends?.length ?? userProfile.friendCount ?? 0;
        else if (type === 'CHECKIN_COUNT') currentValue = userProfile.totalCheckIns || 0;
        else if (type === 'SECURITY_INSPECTIONS') currentValue = userProfile.securityInspections || 0;
        else if (type === 'STAFF_ASSEMBLIES_COUNT') currentValue = userProfile.staffAssembliesCount || 0;
        
        progressPercent = Math.min(100, Math.round((currentValue / value) * 100));
        progressText = `${currentValue}/${value}`;
    }

    return (
        <button
            onClick={onClick}
            className={`w-full aspect-square border rounded-3xl ${
                locked && progressPercent > 0 ? 'p-2 md:p-5' : 'p-3 sm:p-5 md:p-6'
            } flex flex-col items-center justify-center gap-2 sm:gap-4 
                transition-all duration-500 group/badge relative overflow-hidden shadow-xl hover:shadow-2xl ${cardStyle}`}
        >
            {/* Glow overlay (unlocked only) */}
            {!locked && rarity.glowClass && (
                <div className={`absolute inset-0 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-700 pointer-events-none ${rarity.glowClass}`} />
            )}

            {/* Lock Overlay for Locked Badges */}
            {locked && (
                <div className="absolute top-3.5 right-3.5 z-20 w-7 h-7 rounded-full bg-black/80 border border-white/10 flex items-center justify-center shadow-lg group-hover/badge:border-white/30 group-hover/badge:scale-110 transition-all duration-300">
                    <Lock className="w-3.5 h-3.5 text-white/40 group-hover/badge:text-white/90 transition-colors" />
                </div>
            )}

            {/* Icon or Emoji */}
            <div className="relative z-10">
                {displayEmoji ? (
                    <span className="text-2xl sm:text-4xl md:text-5xl group-hover/badge:scale-110 transition-transform duration-500 inline-block drop-shadow-2xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                        {displayEmoji}
                    </span>
                ) : (
                    <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/badge:border-current/30 transition-all shadow-inner">
                        <IconComponent className={`w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-500 ${rarity.iconClass}`} />
                    </div>
                )}
            </div>

            {/* Name & Rarity */}
            <div className="relative z-10 text-center space-y-1 w-full">
                <p className="text-[11px] md:text-[13px] font-black uppercase tracking-widest opacity-90 leading-tight truncate px-1 drop-shadow-sm">
                    {template.name}
                </p>
                <div className="flex items-center justify-center gap-2 opacity-40 group-hover/badge:opacity-100 transition-opacity">
                    <div className="h-px flex-1 bg-current opacity-20 max-w-[12px]" />
                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">{rarity.label}</p>
                    <div className="h-px flex-1 bg-current opacity-20 max-w-[12px]" />
                </div>
                {/* Progress bar for locked badges */}
                {locked && progressPercent > 0 && (
                    <div className="w-full space-y-1 mt-2 z-10">
                        <div className="flex justify-between text-[7px] md:text-[8px] font-black uppercase tracking-wider text-white/30">
                            <span>Progresso</span>
                            <span>{progressText}</span>
                        </div>
                        <div className="h-1 w-full bg-black/40 border border-white/5 rounded-full overflow-hidden p-px">
                            <div 
                                style={{ width: `${progressPercent}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Shine */}
            {!locked && (
                <div className="absolute inset-0 translate-x-[-150%] group-hover/badge:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent skew-x-12 pointer-events-none" />
            )}
        </button>
    );
};
