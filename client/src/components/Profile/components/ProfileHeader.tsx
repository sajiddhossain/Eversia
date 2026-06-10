import React from 'react';
import type { UserProfile } from '../../../types';
import { UserPlus, CheckCircle2, Clock, Mail, UserMinus } from 'lucide-react';
import { UserRoleBadge } from '../../Common/UserRoleBadge';
import { calculateLevel, xpProgress, getLevelName, getLevelColor } from '../../../utils/gamification';

import { StatsGrid } from './StatsGrid';

interface ProfileHeaderProps {
    profile: UserProfile;
    isOwn: boolean;
    friendshipState?: 'NONE' | 'PENDING' | 'RECEIVED' | 'FRIENDS';
    onAddFriend?: () => void;
    onAcceptFriend?: () => void;
    onRemoveFriend?: () => void;
    onEdit?: () => void;
    onStatClick?: (section: string) => void;
    isLocked?: boolean;
}

interface CoverStyle {
    borderClass: string;
    textAccentClass: string;
    gradientLeft: string;
    gradientRight: string;
}

const COVER_STYLES: Record<string, CoverStyle> = {
    midnight: {
        borderClass: 'border-blue-500/20',
        textAccentClass: 'text-blue-400',
        gradientLeft: 'from-blue-600/30 to-indigo-800/5',
        gradientRight: 'from-cyan-500/20 to-blue-900/5',
    },
    aurora: {
        borderClass: 'border-emerald-500/20',
        textAccentClass: 'text-emerald-400',
        gradientLeft: 'from-emerald-600/30 to-teal-800/5',
        gradientRight: 'from-cyan-500/20 to-emerald-900/5',
    },
    sunset: {
        borderClass: 'border-rose-500/20',
        textAccentClass: 'text-rose-400',
        gradientLeft: 'from-rose-600/30 to-orange-800/5',
        gradientRight: 'from-purple-500/20 to-rose-900/5',
    },
    ocean: {
        borderClass: 'border-indigo-500/20',
        textAccentClass: 'text-indigo-400',
        gradientLeft: 'from-blue-600/30 to-indigo-800/5',
        gradientRight: 'from-violet-500/20 to-indigo-900/5',
    },
    forest: {
        borderClass: 'border-green-500/20',
        textAccentClass: 'text-emerald-400',
        gradientLeft: 'from-green-600/30 to-emerald-800/5',
        gradientRight: 'from-teal-500/20 to-green-900/5',
    },
    volcano: {
        borderClass: 'border-red-500/20',
        textAccentClass: 'text-red-400',
        gradientLeft: 'from-red-600/35 to-orange-800/5',
        gradientRight: 'from-yellow-500/20 to-red-900/5',
    },
    galaxy: {
        borderClass: 'border-purple-500/20',
        textAccentClass: 'text-purple-400',
        gradientLeft: 'from-purple-600/35 to-fuchsia-800/5',
        gradientRight: 'from-violet-500/20 to-purple-900/5',
    },
    arctic: {
        borderClass: 'border-sky-500/20',
        textAccentClass: 'text-sky-400',
        gradientLeft: 'from-cyan-600/30 to-blue-800/5',
        gradientRight: 'from-sky-500/20 to-cyan-900/5',
    },
    noir: {
        borderClass: 'border-white/10',
        textAccentClass: 'text-white/60',
        gradientLeft: 'from-zinc-700/20 to-neutral-900/5',
        gradientRight: 'from-zinc-800/15 to-neutral-900/5',
    },
    lime: {
        borderClass: 'border-brand-lime/20',
        textAccentClass: 'text-brand-lime',
        gradientLeft: 'from-lime-500/30 to-green-800/5',
        gradientRight: 'from-emerald-500/20 to-lime-900/5',
    },
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
    profile, 
    isOwn, 
    friendshipState = 'NONE', 
    onAddFriend,
    onAcceptFriend,
    onRemoveFriend,
    onEdit: _onEdit,
    onStatClick,
    isLocked
}) => {
    const coverId = profile.coverColor || 'midnight';
    const coverStyle = COVER_STYLES[coverId] || COVER_STYLES.midnight;


    const level = calculateLevel(profile.xp || 0);
    const { current, needed, percent } = xpProgress(profile.xp || 0);
    const lvlName = getLevelName(level);

    // Level Tiers (1 to 7)
    let tier = 1;
    if (level >= 50) tier = 7;
    else if (level >= 30) tier = 6;
    else if (level >= 20) tier = 5;
    else if (level >= 15) tier = 4;
    else if (level >= 10) tier = 3;
    else if (level >= 5) tier = 2;

    // Avatar border and background config based on Level Tier
    const avatarFrameConfigs: Record<number, { border: string; glow: string; textGrad: string; bgGrad: string }> = {
        1: { // Novizio / Apprendista
            border: 'border-slate-800 border-2',
            glow: 'shadow-[0_0_15px_rgba(255,255,255,0.01)]',
            textGrad: 'from-slate-300 via-slate-100 to-slate-400',
            bgGrad: 'from-white/[0.01] to-white/[0.03]'
        },
        2: { // Esploratore / Esperto
            border: 'border-emerald-500/40 border-2 animate-pulse-glow-emerald',
            glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
            textGrad: 'from-emerald-400 to-teal-300',
            bgGrad: 'from-emerald-950/10 to-transparent'
        },
        3: { // Veterano
            border: 'border-blue-500/40 border-2 animate-pulse-glow-blue',
            glow: 'shadow-[0_0_20px_rgba(0,130,230,0.08)]',
            textGrad: 'from-blue-400 to-indigo-300',
            bgGrad: 'from-blue-950/10 to-transparent'
        },
        4: { // Campione
            border: 'border-purple-500/40 border-2 animate-pulse-glow-purple',
            glow: 'shadow-[0_0_25px_rgba(168,85,247,0.12)]',
            textGrad: 'from-purple-400 to-fuchsia-300',
            bgGrad: 'from-purple-950/10 to-transparent'
        },
        5: { // Leggenda
            border: 'border-orange-500/40 border-2 animate-pulse-glow-orange',
            glow: 'shadow-[0_0_25px_rgba(249,115,22,0.12)]',
            textGrad: 'from-orange-400 to-amber-300',
            bgGrad: 'from-orange-950/10 to-transparent'
        },
        6: { // Maestro
            border: 'border-brand-lime/50 border-2 animate-pulse-glow-lime',
            glow: 'shadow-[0_0_30px_rgba(226,243,60,0.15)]',
            textGrad: 'from-brand-lime to-emerald-300',
            bgGrad: 'from-lime-950/10 to-transparent'
        },
        7: { // Mitologico
            border: 'border-cyan-400/60 border-2 animate-pulse-glow-cyan',
            glow: 'shadow-[0_0_35px_rgba(6,182,212,0.25)]',
            textGrad: 'from-cyan-300 via-primary to-brand-lime bg-gradient-to-r animate-liquid-gradient',
            bgGrad: 'from-cyan-950/10 via-slate-900/40 to-blue-950/10'
        }
    };

    const frameConfig = avatarFrameConfigs[tier] || avatarFrameConfigs[1];

    const initial = (profile.displayName || profile.username || 'U')
        .replace(/^@/, '')
        .charAt(0)
        .toUpperCase();

    const renderLevelBadge = () => {
        let badgeColorClass = '';
        let textColorClass = 'text-white';
        let glowClass = '';
        
        if (tier === 1) {
            badgeColorClass = 'text-slate-500 fill-slate-950/90';
            textColorClass = 'text-slate-300';
        } else if (tier === 2) {
            badgeColorClass = 'text-emerald-500 fill-emerald-950/90';
            textColorClass = 'text-emerald-300';
            glowClass = 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]';
        } else if (tier === 3) {
            badgeColorClass = 'text-blue-500 fill-blue-950/90';
            textColorClass = 'text-blue-300';
            glowClass = 'drop-shadow-[0_0_8px_rgba(0,130,230,0.5)]';
        } else if (tier === 4) {
            badgeColorClass = 'text-purple-500 fill-purple-950/90';
            textColorClass = 'text-purple-300';
            glowClass = 'drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]';
        } else if (tier === 5) {
            badgeColorClass = 'text-orange-500 fill-orange-950/90';
            textColorClass = 'text-orange-300';
            glowClass = 'drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]';
        } else if (tier === 6) {
            badgeColorClass = 'text-brand-lime fill-lime-950/90';
            textColorClass = 'text-brand-lime';
            glowClass = 'drop-shadow-[0_0_12px_rgba(226,243,60,0.7)]';
        } else {
            badgeColorClass = 'text-cyan-400 fill-slate-950/95';
            textColorClass = 'text-cyan-300 font-black animate-pulse';
            glowClass = 'drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]';
        }

        return (
            <div className={`absolute -bottom-2 -right-2 z-20 flex items-center justify-center w-11 h-11 md:w-13 md:h-13 select-none ${glowClass}`}>
                <svg className={`absolute w-full h-full ${badgeColorClass}`} viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <polygon 
                        points="50,5 90,28 90,72 50,95 10,72 10,28" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        strokeLinejoin="round"
                    />
                </svg>
                <span className={`relative z-10 text-[10px] md:text-[11px] font-mono font-bold tracking-tighter ${textColorClass}`}>
                    {level.toString().padStart(2, '0')}
                </span>
            </div>
        );
    };

    const friendButtonConfig: Record<string, { 
        label: string; 
        icon: any; 
        cls: string; 
        onClick: () => void; 
        hoverLabel?: string; 
        hoverIcon?: any;
    }> = {
        NONE: { 
            label: 'Aggiungi', 
            icon: UserPlus, 
            cls: 'bg-brand-lime text-black shadow-[0_0_20px_rgba(226,243,60,0.25)] hover:shadow-[0_0_30px_rgba(226,243,60,0.35)]',
            onClick: onAddFriend || (() => {})
        },
        PENDING: { 
            label: 'Inviata', 
            icon: Clock, 
            cls: 'bg-white/5 text-white/40 border border-white/10 cursor-default',
            onClick: () => {} 
        },
        RECEIVED: { 
            label: 'Accetta', 
            icon: CheckCircle2, 
            cls: 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-emerald-400',
            onClick: onAcceptFriend || (() => {})
        },
        FRIENDS: { 
            label: 'Amici', 
            icon: CheckCircle2, 
            cls: 'bg-white/5 text-white/40 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 group/btn',
            hoverLabel: 'Rimuovi',
            hoverIcon: UserMinus,
            onClick: onRemoveFriend || (() => {})
        },
    };

    const btn = friendButtonConfig[friendshipState];

    return (
        <div className={`relative overflow-hidden rounded-[2rem] bg-[#0d0d11]/40 border ${coverStyle.borderClass} backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)]`}>
            {/* Ambient Glow Orbs (Dual) */}
            <div className={`absolute w-[450px] h-[450px] -top-36 -left-36 bg-gradient-to-br ${coverStyle.gradientLeft} rounded-full blur-[110px] opacity-35 pointer-events-none`} />
            <div className={`absolute w-[400px] h-[400px] -bottom-32 -right-32 bg-gradient-to-tl ${coverStyle.gradientRight} rounded-full blur-[100px] opacity-25 pointer-events-none`} />
            <div className="absolute inset-0 bg-gradient-to-t from-surface/60 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 p-6 md:p-12 lg:p-14 pt-12 md:pt-16">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 lg:gap-16 text-center md:text-left">
                    {/* Left Column: Avatar + Action Button */}
                    <div className="flex flex-col items-center gap-6 flex-shrink-0 w-full md:w-auto">
                        <div className="relative group">
                            <div className={`relative w-36 h-36 md:w-44 md:h-44 rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br ${frameConfig.bgGrad} ${frameConfig.border} ${frameConfig.glow} flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-[1.03]`}>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
                                <span className={`text-5xl md:text-6xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-br ${frameConfig.textGrad} drop-shadow-lg tracking-tighter`}>
                                    {initial}
                                </span>
                                <div className="absolute inset-0 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent skew-x-12 pointer-events-none" />
                            </div>
                            {renderLevelBadge()}
                        </div>
 
                        {/* Action Button: Add Friend (only shown if viewing another user's profile) */}
                        {!isOwn && (
                            <div className="w-full max-w-[144px] md:max-w-none md:w-full">
                                <button
                                    onClick={btn.onClick}
                                    disabled={friendshipState === 'PENDING'}
                                    className={`w-full px-5 py-3 md:py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold font-display transition-all btn-press justify-center select-none ${btn.cls}`}
                                >
                                    {friendshipState === 'FRIENDS' ? (
                                        <>
                                            <btn.icon className="w-3.5 h-3.5 group-hover/btn:hidden" />
                                            <span className="group-hover/btn:hidden">{btn.label}</span>
                                            {btn.hoverIcon && <btn.hoverIcon className="w-3.5 h-3.5 hidden group-hover/btn:block" />}
                                            <span className="hidden group-hover/btn:block">{btn.hoverLabel}</span>
                                        </>
                                    ) : (
                                        <>
                                            <btn.icon className="w-3.5 h-3.5" />
                                            {btn.label}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
 
                    {/* Right Column: Identity Info & Progression HUD */}
                    <div className="flex-1 space-y-6 min-w-0 w-full">
                        {/* Identity & Sub-header */}
                        <div className="space-y-3">
                                <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white drop-shadow-xl break-words whitespace-normal leading-tight flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    {profile.displayName}
                                    <UserRoleBadge role={profile.role} className="mt-1" interactive={true} />
                                </h1>
                            <div className="flex items-center justify-center md:justify-start gap-x-5 gap-y-2 flex-wrap text-white/50 w-full overflow-hidden">
                                <span className={`font-semibold font-display text-xs md:text-sm tracking-normal opacity-90 break-all shrink-0 ${coverStyle.textAccentClass}`}>{profile.username}</span>
                                {profile.className && (
                                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold font-display bg-white/5 text-white/40 border border-white/5 shrink-0 select-none">
                                        Classe {profile.className}
                                    </span>
                                )}
                                {!isLocked && (
                                    <a 
                                        href={`mailto:${profile.email}`}
                                        className={`flex items-center gap-2 text-white/30 hover:${coverStyle.textAccentClass} transition-colors group/info max-w-full overflow-hidden`}
                                    >
                                        <Mail className={`w-3.5 h-3.5 text-white/10 group-hover/info:${coverStyle.textAccentClass}/50 shrink-0`} />
                                        <span className="text-xs font-semibold font-display break-all truncate">{profile.email}</span>
                                    </a>
                                )}
                            </div>
                        </div>
 
                        {/* Bio Paragraph */}
                        <p className="text-white/40 text-sm md:text-base leading-relaxed max-w-2xl mx-auto md:mx-0 font-medium">
                            {profile.bio || (isOwn ? "Tocca modifica per aggiungere una bio ✨" : "Nessuna bio.")}
                        </p>
 
                        {/* Bento Grid: XP Progression & Stats Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2 items-stretch">
                            {/* XP Progress Bar Box (Occupies 2 columns on lg) */}
                            <div className="lg:col-span-2 flex flex-col justify-center bg-white/[0.01] border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-md">
                                <div className="flex items-center justify-between text-xs font-semibold font-display text-white/40 mb-2.5 select-none">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${getLevelColor(level)} animate-pulse`} />
                                        <span>Lvl {level} • {lvlName}</span>
                                    </div>
                                    <span className="tabular-nums text-white/30 text-[10px] font-bold bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">{percent}%</span>
                                </div>
                                <div className="relative h-4.5 bg-black/40 border border-white/5 rounded-xl overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
                                    <div 
                                        style={{ width: `${percent}%` }}
                                        className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${getLevelColor(level)} transition-all duration-1000 ease-out rounded-lg`}
                                    />
                                    <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0),rgba(255,255,255,0.05)_50%,rgba(255,255,255,0))] bg-[length:200%_100%] animate-shimmer pointer-events-none" />
                                    <span className="relative z-10 text-[9px] font-mono font-semibold text-white/95 tracking-wide tabular-nums">
                                        {current.toLocaleString()} / {needed.toLocaleString()} XP
                                    </span>
                                </div>
                            </div>

                            {/* Stats Grid Box (Occupies 3 columns on lg) */}
                            <div className="lg:col-span-3 flex items-center w-full">
                                <StatsGrid profile={profile} onStatClick={onStatClick} isLocked={isLocked} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
